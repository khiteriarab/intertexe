-- =============================================================================
-- Shared merchandising refresh v2 (homepage_merch_rails + homepage_feed_items)
-- Run manually after review: SELECT public.refresh_homepage_feeds_v2();
-- Does NOT mutate products or approvals.
-- =============================================================================

-- Allow denser rails (homepage + material hubs)
ALTER TABLE public.homepage_merch_rails
  DROP CONSTRAINT IF EXISTS homepage_merch_rails_max_items_check;

ALTER TABLE public.homepage_merch_rails
  ADD CONSTRAINT homepage_merch_rails_max_items_check
  CHECK (max_items >= 0 AND max_items <= 64);

ALTER TABLE public.homepage_feed_meta
  ADD COLUMN IF NOT EXISTS display_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.homepage_feed_meta.display_count IS
  'Precomputed count for UI copy (verified pieces). No runtime catalog_list_count.';

-- Registry: enable full fabric/collection tree + canonical strategies
INSERT INTO public.homepage_merch_rails (
  rail_key, axis, slug, display_label, canonical_collection_slug,
  max_items, max_per_brand, refresh_strategy, enabled, sort_order, notes
) VALUES
  ('fabrics:wool', 'fabrics', 'wool', 'Wool', 'wool-edit',
    32, 3, 'fiber_catalog', true, 50, 'fiber_catalog + wool-edit when RPC exists'),
  ('fabrics:cotton', 'fabrics', 'cotton', 'Cotton', 'cotton-edit',
    32, 3, 'fiber_catalog', true, 60, 'fiber_catalog + cotton-edit when RPC exists'),
  ('collections:evening', 'collections', 'evening', 'Evening', 'silk-occasion',
    24, 3, 'collection_canonical', true, 90, 'legacy canonical via alias'),
  ('collections:tailoring', 'collections', 'tailoring', 'Tailoring', 'tailoring-edit',
    24, 3, 'collection_canonical', true, 100, NULL),
  ('collections:summer-in-the-city', 'collections', 'summer-in-the-city', 'Summer in the City', 'city-wardrobe',
    24, 3, 'collection_canonical', true, 110, NULL),
  ('collections:white-edit', 'collections', 'white-edit', 'The White Edit', 'white-edit',
    24, 3, 'collection_canonical', true, 120, 'confirm slug in CMS')
ON CONFLICT (rail_key) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  canonical_collection_slug = EXCLUDED.canonical_collection_slug,
  max_items = EXCLUDED.max_items,
  max_per_brand = EXCLUDED.max_per_brand,
  refresh_strategy = EXCLUDED.refresh_strategy,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order,
  notes = EXCLUDED.notes;

UPDATE public.homepage_merch_rails SET
  max_items = 20, max_per_brand = 3, enabled = true, refresh_strategy = 'new_in_brands'
WHERE rail_key = 'top:new_in';

UPDATE public.homepage_merch_rails SET
  max_items = 32, max_per_brand = 3, enabled = true, refresh_strategy = 'collection_canonical',
  canonical_collection_slug = 'silk-edit'
WHERE rail_key = 'fabrics:silk';

UPDATE public.homepage_merch_rails SET
  max_items = 32, max_per_brand = 3, enabled = true, refresh_strategy = 'collection_canonical',
  canonical_collection_slug = 'linen-essentials'
WHERE rail_key = 'fabrics:linen';

UPDATE public.homepage_merch_rails SET
  max_items = 32, max_per_brand = 3, enabled = true, refresh_strategy = 'collection_canonical',
  canonical_collection_slug = 'cashmere-edit'
WHERE rail_key = 'fabrics:cashmere';

UPDATE public.homepage_merch_rails SET
  max_items = 24, max_per_brand = 3, enabled = true, refresh_strategy = 'collection_canonical',
  canonical_collection_slug = 'vacation-shop'
WHERE rail_key = 'collections:vacation';

UPDATE public.homepage_merch_rails SET
  max_items = 32, max_per_brand = 4, enabled = true, refresh_strategy = 'sale_flag'
WHERE rail_key = 'sale:all';

-- -----------------------------------------------------------------------------
-- refresh_homepage_feeds_v2
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_homepage_feeds_v2(
  p_preferred_region text DEFAULT 'us'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := clock_timestamp();
  v_global_ms integer;
  v_rail record;
  v_rail_started timestamptz;
  v_rail_ms integer;
  v_source_count integer;
  v_inserted integer;
  v_err text;
  v_result jsonb := '{}'::jsonb;
  v_fiber text;
  v_source_sql text;
  v_slug text;
  v_region text := coalesce(nullif(trim(p_preferred_region), ''), 'us');

  v_new_in_brands text[] := ARRAY[
    'frame', 'vince', 'theory', 'toteme', 'ganni', 'staud', 'khaite', 'isabel-marant',
    'rag-and-bone', 'citizens-of-humanity', 'reformation', 'nili-lotan'
  ];
  v_pool_scan_limit constant integer := 5000;
  v_new_in_scan_limit constant integer := 400;
  v_sale_scan_limit constant integer := 600;
  v_canonical_scan_limit constant integer := 2000;
  v_fiber_scan_limit constant integer := 2500;
  v_global_listed integer;
BEGIN
  SET LOCAL statement_timeout = '120s';

  -- Broad apparel scan (no brand starvation)
  DROP TABLE IF EXISTS homepage_pool_raw;
  CREATE TEMP TABLE homepage_pool_raw ON COMMIT DROP AS
  SELECT
    l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
    l.composition, l.natural_fiber_percent, l.category, l.region, l.is_sale, l.created_at,
    lower(coalesce(l.composition, '')) AS comp_l
  FROM public.live_products_apparel AS l
  WHERE l.natural_fiber_percent >= 80
    AND public.homepage_price_listed(l.price, l.image_url)
  ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST
  LIMIT v_pool_scan_limit;

  DROP TABLE IF EXISTS homepage_pool;
  CREATE TEMP TABLE homepage_pool ON COMMIT DROP AS
  SELECT
    d.id, d.product_id, d.brand_slug, d.brand_name, d.name, d.url, d.image_url, d.price,
    d.composition, d.natural_fiber_percent, d.category, d.region, d.is_sale, d.created_at, d.comp_l
  FROM (
    SELECT
      r.*,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          r.image_url, r.brand_name, r.name, r.composition, r.product_id, r.id
        )
        ORDER BY
          public.catalog_region_rank(r.region, v_region),
          r.natural_fiber_percent DESC NULLS LAST,
          r.created_at DESC NULLS LAST
      ) AS dedupe_rn
    FROM homepage_pool_raw AS r
  ) AS d
  WHERE d.dedupe_rn = 1;

  v_global_listed := (SELECT COUNT(*)::integer FROM homepage_pool);

  DROP TABLE IF EXISTS homepage_new_in_src;
  CREATE TEMP TABLE homepage_new_in_src ON COMMIT DROP AS
  SELECT
    ni.id, ni.product_id, ni.brand_slug, ni.brand_name, ni.name, ni.url, ni.image_url, ni.price,
    ni.composition, ni.natural_fiber_percent, ni.category, ni.region, ni.is_sale, ni.created_at
  FROM (
    SELECT
      l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
      l.composition, l.natural_fiber_percent, l.category, l.region, l.is_sale, l.created_at,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
        )
        ORDER BY
          public.catalog_region_rank(l.region, v_region),
          l.created_at DESC NULLS LAST,
          l.natural_fiber_percent DESC NULLS LAST
      ) AS dedupe_rn
    FROM public.live_products_apparel AS l
    WHERE l.brand_slug = ANY (v_new_in_brands)
      AND l.natural_fiber_percent >= 80
      AND public.homepage_price_listed(l.price, l.image_url)
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT v_new_in_scan_limit
  ) AS ni
  WHERE ni.dedupe_rn = 1;

  DROP TABLE IF EXISTS homepage_sale_src;
  CREATE TEMP TABLE homepage_sale_src ON COMMIT DROP AS
  SELECT
    s.id, s.product_id, s.brand_slug, s.brand_name, s.name, s.url, s.image_url, s.price,
    s.composition, s.natural_fiber_percent, s.category, s.region, s.is_sale, s.created_at
  FROM (
    SELECT
      l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
      l.composition, l.natural_fiber_percent, l.category, l.region, l.is_sale, l.created_at,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
        )
        ORDER BY
          public.catalog_region_rank(l.region, v_region),
          l.natural_fiber_percent DESC NULLS LAST,
          l.created_at DESC NULLS LAST
      ) AS dedupe_rn
    FROM public.live_products_apparel AS l
    WHERE l.is_sale IS TRUE
      AND l.natural_fiber_percent >= 80
      AND public.homepage_price_listed(l.price, l.image_url)
    ORDER BY l.natural_fiber_percent DESC NULLS LAST
    LIMIT v_sale_scan_limit
  ) AS s
  WHERE s.dedupe_rn = 1;

  FOR v_rail IN
    SELECT * FROM public.homepage_merch_rails ORDER BY sort_order
  LOOP
    v_rail_started := clock_timestamp();

    IF NOT v_rail.enabled OR v_rail.max_items = 0 THEN
      DELETE FROM public.homepage_feed_items WHERE rail_key = v_rail.rail_key;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(), refresh_ms = 0, row_count = 0,
          source_rows = 0, display_count = 0, last_error = NULL
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(v_rail.rail_key, jsonb_build_object('skipped', 'disabled'));
      CONTINUE;
    END IF;

    IF v_rail.refresh_strategy = 'designers_curated' THEN
      DELETE FROM public.homepage_feed_items WHERE rail_key = v_rail.rail_key;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(), refresh_ms = 0, row_count = 0,
          source_rows = 0, display_count = 0, last_error = NULL
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(
        v_rail.rail_key, jsonb_build_object('rows', 0, 'note', 'designers — not product cache')
      );
      CONTINUE;
    END IF;

    BEGIN
      v_source_sql := NULL;
      v_source_count := 0;

      IF v_rail.refresh_strategy = 'new_in_brands' THEN
        v_source_count := (SELECT COUNT(*)::integer FROM homepage_new_in_src);
        v_source_sql := $sql$
          SELECT
            n.id, n.product_id, n.brand_slug, n.brand_name, n.name, n.url, n.image_url, n.price,
            n.natural_fiber_percent, n.category, n.is_sale,
            row_number() OVER (
              ORDER BY n.created_at DESC NULLS LAST, n.natural_fiber_percent DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_new_in_src AS n
        $sql$;

      ELSIF v_rail.refresh_strategy = 'collection_canonical' THEN
        v_slug := coalesce(v_rail.canonical_collection_slug, v_rail.slug);
        DROP TABLE IF EXISTS homepage_canonical_src;
        CREATE TEMP TABLE homepage_canonical_src ON COMMIT DROP AS
        SELECT
          e.id, e.product_id, e.brand_slug, e.brand_name, e.name, e.url, e.image_url, e.price,
          e.natural_fiber_percent, e.category, e.is_sale, e.created_at
        FROM public.editorial_collection_products(v_slug, v_region, v_canonical_scan_limit) AS e;

        v_source_count := (SELECT COUNT(*)::integer FROM homepage_canonical_src);

        IF v_source_count = 0 AND v_rail.axis = 'fabrics' THEN
          v_fiber := v_rail.slug;
          DROP TABLE IF EXISTS homepage_canonical_src;
          CREATE TEMP TABLE homepage_canonical_src ON COMMIT DROP AS
          SELECT
            p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
            p.natural_fiber_percent, p.category, p.is_sale, p.created_at
          FROM homepage_pool AS p
          WHERE p.comp_l LIKE '%' || v_fiber || '%'
          ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
          LIMIT v_fiber_scan_limit;
          v_source_count := (SELECT COUNT(*)::integer FROM homepage_canonical_src);
        END IF;

        v_source_sql := $sql$
          SELECT
            c.id, c.product_id, c.brand_slug, c.brand_name, c.name, c.url, c.image_url, c.price,
            c.natural_fiber_percent, c.category, c.is_sale,
            row_number() OVER (
              ORDER BY c.natural_fiber_percent DESC NULLS LAST, c.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_canonical_src AS c
        $sql$;

      ELSIF v_rail.refresh_strategy = 'fiber_catalog' THEN
        v_fiber := v_rail.slug;
        DROP TABLE IF EXISTS homepage_fiber_src;
        CREATE TEMP TABLE homepage_fiber_src ON COMMIT DROP AS
        SELECT
          p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
          p.natural_fiber_percent, p.category, p.is_sale, p.created_at
        FROM homepage_pool AS p
        WHERE (
          p.comp_l LIKE '%' || v_fiber || '%'
          OR (v_fiber = 'wool' AND (p.comp_l LIKE '%merino%' OR p.comp_l LIKE '%lambswool%'))
          OR (v_fiber = 'cotton' AND p.comp_l LIKE '%organic cotton%')
        )
        ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
        LIMIT v_fiber_scan_limit;

        IF (SELECT COUNT(*) FROM homepage_fiber_src) < 12
           AND v_rail.canonical_collection_slug IS NOT NULL THEN
          INSERT INTO homepage_fiber_src
          SELECT
            e.id, e.product_id, e.brand_slug, e.brand_name, e.name, e.url, e.image_url, e.price,
            e.natural_fiber_percent, e.category, e.is_sale, e.created_at
          FROM public.editorial_collection_products(
            v_rail.canonical_collection_slug, v_region, v_canonical_scan_limit
          ) AS e
          WHERE NOT EXISTS (SELECT 1 FROM homepage_fiber_src f WHERE f.id = e.id);
        END IF;

        v_source_count := (SELECT COUNT(*)::integer FROM homepage_fiber_src);
        v_source_sql := $sql$
          SELECT
            f.id, f.product_id, f.brand_slug, f.brand_name, f.name, f.url, f.image_url, f.price,
            f.natural_fiber_percent, f.category, f.is_sale,
            row_number() OVER (
              ORDER BY f.natural_fiber_percent DESC NULLS LAST, f.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_fiber_src AS f
        $sql$;

      ELSIF v_rail.refresh_strategy = 'brand_pool_fiber' THEN
        v_fiber := v_rail.slug;
        v_source_count := (
          SELECT COUNT(*)::integer FROM homepage_pool WHERE comp_l LIKE '%' || v_fiber || '%'
        );
        v_source_sql := format($sql$
          SELECT
            p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
            p.natural_fiber_percent, p.category, p.is_sale,
            row_number() OVER (
              ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_pool AS p
          WHERE p.comp_l LIKE '%%' || %L || '%%'
        $sql$, v_fiber);

      ELSIF v_rail.refresh_strategy = 'brand_pool_vacation' THEN
        v_source_count := (
          SELECT COUNT(*)::integer FROM homepage_pool
          WHERE comp_l LIKE '%linen%' OR comp_l LIKE '%cotton%' OR comp_l LIKE '%silk%'
        );
        v_source_sql := $sql$
          SELECT
            p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
            p.natural_fiber_percent, p.category, p.is_sale,
            row_number() OVER (
              ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_pool AS p
          WHERE p.comp_l LIKE '%linen%' OR p.comp_l LIKE '%cotton%' OR p.comp_l LIKE '%silk%'
        $sql$;

      ELSIF v_rail.refresh_strategy = 'sale_flag' THEN
        DROP TABLE IF EXISTS homepage_sale_candidates;
        CREATE TEMP TABLE homepage_sale_candidates ON COMMIT DROP AS
        SELECT
          p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
          p.composition, p.natural_fiber_percent, p.category, p.region, p.is_sale, p.created_at
        FROM homepage_pool AS p
        WHERE p.is_sale IS TRUE
        UNION ALL
        SELECT
          s.id, s.product_id, s.brand_slug, s.brand_name, s.name, s.url, s.image_url, s.price,
          s.composition, s.natural_fiber_percent, s.category, s.region, s.is_sale, s.created_at
        FROM homepage_sale_src AS s
        WHERE NOT EXISTS (SELECT 1 FROM homepage_pool AS p WHERE p.id = s.id);

        v_source_count := (SELECT COUNT(*)::integer FROM homepage_sale_candidates);
        v_source_sql := format($sql$
          SELECT
            c.id, c.product_id, c.brand_slug, c.brand_name, c.name, c.url, c.image_url, c.price,
            c.natural_fiber_percent, c.category, true AS is_sale,
            row_number() OVER (
              ORDER BY c.natural_fiber_percent DESC NULLS LAST, c.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM (
            SELECT DISTINCT ON (
              public.catalog_dedupe_key(c.image_url, c.brand_name, c.name, c.composition, c.product_id, c.id)
            ) c.*
            FROM homepage_sale_candidates AS c
            ORDER BY
              public.catalog_dedupe_key(c.image_url, c.brand_name, c.name, c.composition, c.product_id, c.id),
              public.catalog_region_rank(c.region, %L),
              c.natural_fiber_percent DESC NULLS LAST,
              c.created_at DESC NULLS LAST
          ) AS c
        $sql$, v_region);

      ELSE
        RAISE EXCEPTION 'Unknown refresh_strategy: %', v_rail.refresh_strategy;
      END IF;

      v_inserted := public.homepage_feed_insert_picked(
        v_rail.rail_key,
        v_rail.max_items,
        v_rail.max_per_brand,
        v_source_sql
      );

      v_rail_ms := (extract(epoch FROM (clock_timestamp() - v_rail_started)) * 1000)::integer;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(),
          refresh_ms = v_rail_ms,
          row_count = v_inserted::smallint,
          source_rows = v_source_count,
          display_count = GREATEST(v_source_count, v_inserted),
          last_error = NULL
      WHERE rail_key = v_rail.rail_key;

      v_result := v_result || jsonb_build_object(
        v_rail.rail_key,
        jsonb_build_object('rows', v_inserted, 'source_rows', v_source_count, 'strategy', v_rail.refresh_strategy)
      );

    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(),
          refresh_ms = (extract(epoch FROM (clock_timestamp() - v_rail_started)) * 1000)::integer,
          last_error = v_err
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(v_rail.rail_key, jsonb_build_object('error', v_err));
    END;
  END LOOP;

  v_global_ms := (extract(epoch FROM (clock_timestamp() - v_started_at)) * 1000)::integer;
  UPDATE public.homepage_feed_meta
  SET refreshed_at = clock_timestamp(),
      refresh_ms = v_global_ms,
      row_count = v_global_listed::smallint,
      source_rows = v_global_listed,
      display_count = v_global_listed,
      last_error = NULL
  WHERE rail_key = 'global';

  RETURN v_result || jsonb_build_object('_global_listed', v_global_listed, '_ms', v_global_ms);
END;
$$;

COMMENT ON FUNCTION public.refresh_homepage_feeds_v2(text) IS
  'Shared merchandising cache refresh: expanded pool, collection_canonical, fiber_catalog, regional dedupe.';

REVOKE ALL ON FUNCTION public.refresh_homepage_feeds_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_homepage_feeds_v2(text) TO service_role;

-- Back-compat entrypoint
CREATE OR REPLACE FUNCTION public.refresh_homepage_feeds()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.refresh_homepage_feeds_v2('us');
$$;

REVOKE ALL ON FUNCTION public.refresh_homepage_feeds() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_homepage_feeds() TO service_role;

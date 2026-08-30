-- Restore editorial_collection_products + silk/vacation wrappers for homepage refresh v2.
-- Patch refresh_homepage_feeds_v2 fiber fallbacks to catalog_material_rail_eligible.
-- After apply: SELECT public.refresh_homepage_feeds_v2('us');

-- -----------------------------------------------------------------------------
-- collection_slug_aliases — production uses (canonical_slug, aliases text[])
-- Do not recreate or reseed; only add resolver helpers.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.editorial_resolve_collection_slug(p_slug text)
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(
    (
      SELECT a.canonical_slug
      FROM public.collection_slug_aliases a
      WHERE lower(trim(coalesce(p_slug, ''))) = ANY(a.aliases)
         OR a.canonical_slug = lower(trim(coalesce(p_slug, '')))
      ORDER BY
        CASE WHEN a.canonical_slug = lower(trim(coalesce(p_slug, ''))) THEN 0 ELSE 1 END,
        length(a.canonical_slug)
      LIMIT 1
    ),
    lower(trim(coalesce(p_slug, '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.editorial_collection_fiber_for_slug(p_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE public.editorial_resolve_collection_slug(p_slug)
    WHEN 'silk-edit' THEN 'silk'
    WHEN 'linen-essentials' THEN 'linen'
    WHEN 'cashmere-edit' THEN 'cashmere'
    WHEN 'wool-edit' THEN 'wool'
    WHEN 'cotton-edit' THEN 'cotton'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.editorial_collection_membership_slug(p_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE public.editorial_resolve_collection_slug(p_slug)
    WHEN 'vacation-shop' THEN 'vacation'
    WHEN 'tailoring-edit' THEN 'tailoring'
    WHEN 'city-wardrobe' THEN 'summer-in-the-city'
    WHEN 'white-edit' THEN 'white-edit'
    WHEN 'silk-occasion' THEN 'evening'
    ELSE NULL
  END;
$$;

-- -----------------------------------------------------------------------------
-- editorial_collection_products
-- Fiber edits: body/shell material truth via catalog_material_rail_eligible.
-- Collection edits: precomputed collection_product_memberships when present.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editorial_collection_products(
  p_collection_slug text,
  p_preferred_region text DEFAULT 'us',
  p_limit integer DEFAULT 1200
)
RETURNS SETOF public.live_products_apparel
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical text := public.editorial_resolve_collection_slug(p_collection_slug);
  v_region text := coalesce(nullif(trim(p_preferred_region), ''), 'us');
  v_lim integer := greatest(1, least(coalesce(p_limit, 1200), 5000));
  v_fiber text := public.editorial_collection_fiber_for_slug(v_canonical);
  v_membership text := public.editorial_collection_membership_slug(v_canonical);
BEGIN
  IF v_fiber IS NOT NULL THEN
    RETURN QUERY
    SELECT l.*
    FROM (
      SELECT c.id,
        row_number() OVER (
          PARTITION BY public.catalog_dedupe_key(
            c.image_url, c.brand_name, c.name, c.composition, c.product_id, c.id
          )
          ORDER BY
            public.catalog_region_rank(c.region, v_region),
            c.natural_fiber_percent DESC NULLS LAST,
            c.created_at DESC NULLS LAST
        ) AS rn
      FROM (
        SELECT p.*
        FROM public.live_products_apparel p
        WHERE coalesce(p.natural_fiber_percent, 0) >= 80
          AND public.homepage_price_listed(p.price, p.image_url)
          AND lower(coalesce(p.composition, '')) ~ CASE v_fiber
            WHEN 'silk' THEN '(silk|mulberry)'
            WHEN 'linen' THEN '(linen|flax)'
            WHEN 'cashmere' THEN 'cashmere'
            WHEN 'wool' THEN '(wool|merino|lambswool|alpaca)'
            WHEN 'cotton' THEN 'cotton'
            ELSE v_fiber
          END
        ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
        LIMIT least(v_lim * 4, 1200)
      ) c
      WHERE public.catalog_material_rail_eligible(c.composition, c.material_metadata, v_fiber)
    ) d
    INNER JOIN public.live_products_apparel l ON l.id = d.id
    WHERE d.rn = 1
    ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST
    LIMIT v_lim;
    RETURN;
  END IF;

  IF v_membership IS NOT NULL
     AND to_regclass('public.collection_product_memberships') IS NOT NULL THEN
    RETURN QUERY
    SELECT l.*
    FROM public.collection_product_memberships m
    INNER JOIN public.live_products_apparel l ON l.id = m.offer_id
    WHERE m.collection_slug = v_membership
      AND coalesce(l.natural_fiber_percent, 0) >= 80
      AND public.homepage_price_listed(l.price, l.image_url)
    ORDER BY m.rank_score DESC NULLS LAST, l.natural_fiber_percent DESC NULLS LAST
    LIMIT v_lim;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT l.*
  FROM (
    SELECT c.id,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          c.image_url, c.brand_name, c.name, c.composition, c.product_id, c.id
        )
        ORDER BY
          public.catalog_region_rank(c.region, v_region),
          c.natural_fiber_percent DESC NULLS LAST,
          c.created_at DESC NULLS LAST
      ) AS rn
    FROM public.live_products_apparel c
    JOIN public.products p ON p.id = c.id
    WHERE coalesce(c.natural_fiber_percent, 0) >= 80
      AND public.homepage_price_listed(c.price, c.image_url)
      AND (
        v_canonical = ANY(coalesce(p.collection_slugs, '{}'::text[]))
        OR v_canonical = ANY(coalesce(p.editorial_categories, '{}'::text[]))
        OR (
          v_canonical = 'vacation-shop'
          AND (
            public.catalog_material_rail_eligible(c.composition, c.material_metadata, 'linen')
            OR public.catalog_material_rail_eligible(c.composition, c.material_metadata, 'cotton')
            OR public.catalog_material_rail_eligible(c.composition, c.material_metadata, 'silk')
          )
        )
      )
  ) d
  INNER JOIN public.live_products_apparel l ON l.id = d.id
  WHERE d.rn = 1
  ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST
  LIMIT v_lim;
END;
$$;

COMMENT ON FUNCTION public.editorial_collection_products(text, text, integer) IS
  'Editorial collection pool for homepage refresh: fiber rails use body material truth; collections use memberships.';

GRANT EXECUTE ON FUNCTION public.editorial_collection_products(text, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.silk_edit_products(
  p_preferred_region text DEFAULT 'us',
  p_limit integer DEFAULT 96
)
RETURNS SETOF public.live_products_apparel
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.editorial_collection_products('silk-edit', p_preferred_region, p_limit);
$$;

CREATE OR REPLACE FUNCTION public.vacation_edit_products(
  p_preferred_region text DEFAULT 'us',
  p_limit integer DEFAULT 96
)
RETURNS SETOF public.live_products_apparel
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.editorial_collection_products('vacation-shop', p_preferred_region, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.silk_edit_products(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacation_edit_products(text, integer) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- refresh_homepage_feeds_v2 — stronger fiber fallbacks (catalog_material_rail_eligible)
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
  v_canonical_scan_limit constant integer := 800;
  v_fiber_scan_limit constant integer := 2500;
  v_global_listed integer;
BEGIN
  SET LOCAL statement_timeout = '180s';

  DROP TABLE IF EXISTS homepage_pool_raw;
  CREATE TEMP TABLE homepage_pool_raw ON COMMIT DROP AS
  SELECT
    l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
    l.composition, l.material_metadata, l.natural_fiber_percent, l.category, l.region, l.is_sale, l.created_at,
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
    d.composition, d.material_metadata, d.natural_fiber_percent, d.category, d.region, d.is_sale, d.created_at, d.comp_l
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

        IF v_rail.axis = 'fabrics' THEN
          v_fiber := v_rail.slug;
          DROP TABLE IF EXISTS homepage_canonical_src;
          CREATE TEMP TABLE homepage_canonical_src ON COMMIT DROP AS
          SELECT
            p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
            p.natural_fiber_percent, p.category, p.is_sale, p.created_at
          FROM homepage_pool AS p
          WHERE public.catalog_material_rail_eligible(p.composition, p.material_metadata, v_fiber)
          ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
          LIMIT v_fiber_scan_limit;
          v_source_count := (SELECT COUNT(*)::integer FROM homepage_canonical_src);

          IF v_source_count = 0 THEN
            DROP TABLE IF EXISTS homepage_canonical_src;
            CREATE TEMP TABLE homepage_canonical_src ON COMMIT DROP AS
            SELECT
              e.id, e.product_id, e.brand_slug, e.brand_name, e.name, e.url, e.image_url, e.price,
              e.natural_fiber_percent, e.category, e.is_sale, e.created_at
            FROM public.editorial_collection_products(v_slug, v_region, v_canonical_scan_limit) AS e;
            v_source_count := (SELECT COUNT(*)::integer FROM homepage_canonical_src);
          END IF;
        ELSE
          DROP TABLE IF EXISTS homepage_canonical_src;
          CREATE TEMP TABLE homepage_canonical_src ON COMMIT DROP AS
          SELECT
            e.id, e.product_id, e.brand_slug, e.brand_name, e.name, e.url, e.image_url, e.price,
            e.natural_fiber_percent, e.category, e.is_sale, e.created_at
          FROM public.editorial_collection_products(v_slug, v_region, v_canonical_scan_limit) AS e;
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
        WHERE public.catalog_material_rail_eligible(p.composition, p.material_metadata, v_fiber)
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
          SELECT COUNT(*)::integer FROM homepage_pool
          WHERE public.catalog_material_rail_eligible(composition, material_metadata, v_fiber)
        );
        v_source_sql := format($sql$
          SELECT
            p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
            p.natural_fiber_percent, p.category, p.is_sale,
            row_number() OVER (
              ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_pool AS p
          WHERE public.catalog_material_rail_eligible(p.composition, p.material_metadata, %L)
        $sql$, v_fiber);

      ELSIF v_rail.refresh_strategy = 'brand_pool_vacation' THEN
        v_source_count := (
          SELECT COUNT(*)::integer FROM homepage_pool
          WHERE public.catalog_material_rail_eligible(composition, material_metadata, 'linen')
             OR public.catalog_material_rail_eligible(composition, material_metadata, 'cotton')
             OR public.catalog_material_rail_eligible(composition, material_metadata, 'silk')
        );
        v_source_sql := $sql$
          SELECT
            p.id, p.product_id, p.brand_slug, p.brand_name, p.name, p.url, p.image_url, p.price,
            p.natural_fiber_percent, p.category, p.is_sale,
            row_number() OVER (
              ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST
            ) AS sort_ord
          FROM homepage_pool AS p
          WHERE public.catalog_material_rail_eligible(p.composition, p.material_metadata, 'linen')
             OR public.catalog_material_rail_eligible(p.composition, p.material_metadata, 'cotton')
             OR public.catalog_material_rail_eligible(p.composition, p.material_metadata, 'silk')
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
  'Shared merchandising cache refresh with editorial_collection_products + material-truth fiber fallbacks.';

NOTIFY pgrst, 'reload schema';

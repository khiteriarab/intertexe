-- =============================================================================
-- Homepage feed CACHE layer (performance only — NOT merchandising source of truth)
-- Depends on: 20240008_live_products_apparel.sql, 20240009_catalog_helper_functions.sql
-- Architecture: docs/MERCHANDISING_AND_HOMEPAGE_FEEDS.md
--
-- Source of truth remains:
--   products, live_products, live_products_apparel,
--   collection_slug_aliases, editorial_collection_products, catalog_list RPCs
--
-- This migration:
--   - Adds registry + unified homepage_feed_items cache per rail_key
--   - Adds refresh_homepage_feeds() (offline; service_role only)
--   - Adds products indexes to speed refresh (not homepage HTTP reads)
--
-- Does NOT:
--   - UPDATE/DELETE products rows or change approvals
--   - Replace final merchandising / CMS collection rules
--   - Auto-run refresh (manual/cron after apply)
--
-- FIRST MANUAL REFRESH (staging/production — run only after review):
--   SELECT public.refresh_homepage_feeds();
--   SELECT rail_key, row_count, refreshed_at, refresh_ms, last_error
--   FROM public.homepage_feed_meta WHERE rail_key <> 'global' ORDER BY rail_key;
--   SELECT rail_key, COUNT(*) FROM public.homepage_feed_items GROUP BY 1 ORDER BY 1;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Merchandising rail registry (full tree; phase-gated via enabled)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.homepage_merch_rails (
  rail_key                    text PRIMARY KEY,
  axis                        text NOT NULL CHECK (axis IN ('top', 'fabrics', 'collections', 'designers', 'sale')),
  slug                        text NOT NULL,
  display_label               text NOT NULL,
  canonical_collection_slug   text,
  max_items                   smallint NOT NULL CHECK (max_items >= 1 AND max_items <= 32),
  max_per_brand               smallint NOT NULL DEFAULT 2 CHECK (max_per_brand >= 1),
  refresh_strategy            text NOT NULL,
  enabled                     boolean NOT NULL DEFAULT false,
  sort_order                  smallint NOT NULL DEFAULT 0,
  notes                       text,
  UNIQUE (axis, slug)
);

COMMENT ON TABLE public.homepage_merch_rails IS
  'Merchandising rail registry (nav tree). Cache refresh reads enabled rows only. '
  'canonical_collection_slug links to SHARED_CATALOG truth; strategies may still use pool split in phase 1.';

COMMENT ON COLUMN public.homepage_merch_rails.rail_key IS
  'Stable id: {axis}:{slug} e.g. fabrics:silk, collections:vacation, top:new_in.';

-- Full INTERTEXE tree (phase 1 = enabled subset for current homepage performance fix).
INSERT INTO public.homepage_merch_rails (
  rail_key, axis, slug, display_label, canonical_collection_slug,
  max_items, refresh_strategy, enabled, sort_order, notes
) VALUES
  ('top:new_in', 'top', 'new_in', 'New In', NULL,
    8, 'new_in_brands', true, 10, 'Phase 1: brand allowlist + created_at'),
  ('fabrics:silk', 'fabrics', 'silk', 'Silk', 'silk-edit',
    10, 'brand_pool_fiber', true, 20, 'Phase 1: pool fiber split; phase 2: collection_canonical'),
  ('fabrics:linen', 'fabrics', 'linen', 'Linen', 'linen-essentials',
    10, 'brand_pool_fiber', true, 30, NULL),
  ('fabrics:cashmere', 'fabrics', 'cashmere', 'Cashmere', 'cashmere-edit',
    10, 'brand_pool_fiber', true, 40, NULL),
  ('fabrics:wool', 'fabrics', 'wool', 'Wool', NULL,
    10, 'brand_pool_fiber', false, 50, 'Enable when material truth / collection rules ready'),
  ('fabrics:cotton', 'fabrics', 'cotton', 'Cotton', NULL,
    10, 'brand_pool_fiber', false, 60, NULL),
  ('fabrics:leather-suede', 'fabrics', 'leather-suede', 'Leather & Suede', NULL,
    10, 'brand_pool_fiber', false, 70, 'Typically excluded from natural-fiber homepage rails'),
  ('collections:vacation', 'collections', 'vacation', 'Vacation', 'vacation-shop',
    10, 'brand_pool_vacation', true, 80, 'Phase 1: pool vacation split; phase 2: collection_canonical'),
  ('collections:evening', 'collections', 'evening', 'Evening', NULL,
    10, 'collection_canonical', false, 90, 'Future: editorial_collection_products'),
  ('collections:tailoring', 'collections', 'tailoring', 'Tailoring', 'tailoring-edit',
    10, 'collection_canonical', false, 100, NULL),
  ('collections:summer-in-the-city', 'collections', 'summer-in-the-city', 'Summer in the City', 'city-wardrobe',
    10, 'collection_canonical', false, 110, 'Confirm CMS slug alias before enable'),
  ('collections:white-edit', 'collections', 'white-edit', 'The White Edit', NULL,
    10, 'collection_canonical', false, 120, 'TBD canonical slug'),
  ('designers:curated', 'designers', 'curated', 'Designers', NULL,
    0, 'designers_curated', true, 130, 'No product rows; website reads designers table'),
  ('sale:all', 'sale', 'all', 'Sale', NULL,
    16, 'sale_flag', true, 140, 'Phase 1: is_sale on apparel surface')
ON CONFLICT (rail_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) Unified feed cache + meta
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.homepage_feed_meta (
  rail_key        text PRIMARY KEY,
  refreshed_at    timestamptz,
  refresh_ms      integer,
  row_count       smallint NOT NULL DEFAULT 0,
  source_rows     integer NOT NULL DEFAULT 0,
  last_error      text,
  version         integer NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.homepage_feed_meta IS
  'Per-rail_key refresh audit. rail_key = global | fabrics:silk | top:new_in | ...';

CREATE TABLE IF NOT EXISTS public.homepage_feed_items (
  rail_key                  text NOT NULL REFERENCES public.homepage_merch_rails (rail_key) ON DELETE CASCADE,
  rank                      smallint NOT NULL CHECK (rank >= 1),
  source_id                 uuid NOT NULL,
  product_id                text NOT NULL,
  brand_slug                text NOT NULL,
  brand_name                text NOT NULL,
  name                      text NOT NULL,
  url                       text NOT NULL,
  image_url                 text NOT NULL,
  price                     text NOT NULL,
  natural_fiber_percent     smallint NOT NULL,
  category                  text,
  is_sale                   boolean NOT NULL DEFAULT false,
  inserted_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rail_key, rank)
);

CREATE INDEX IF NOT EXISTS homepage_feed_items_rail_key_idx ON public.homepage_feed_items (rail_key);
CREATE INDEX IF NOT EXISTS homepage_feed_items_brand_slug_idx ON public.homepage_feed_items (brand_slug);

COMMENT ON TABLE public.homepage_feed_items IS
  'Precomputed product cards per merchandising rail_key. Cache only — refresh from live_products_apparel / future RPCs.';

-- Seed meta rows for all registered rails + global.
INSERT INTO public.homepage_feed_meta (rail_key, row_count, source_rows)
SELECT rail_key, 0, 0 FROM public.homepage_merch_rails
ON CONFLICT (rail_key) DO NOTHING;

INSERT INTO public.homepage_feed_meta (rail_key, row_count, source_rows)
VALUES ('global', 0, 0)
ON CONFLICT (rail_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3) Indexes on products (refresh + /shop; not homepage HTTP hot path)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_brand_slug_live
  ON public.products (brand_slug)
  WHERE approved = 'yes' AND is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_products_new_in_live
  ON public.products (brand_slug, created_at DESC)
  WHERE approved = 'yes' AND is_active IS TRUE
    AND natural_fiber_percent >= 80;

CREATE INDEX IF NOT EXISTS idx_products_is_sale_live
  ON public.products (is_sale, natural_fiber_percent DESC)
  WHERE approved = 'yes' AND is_active IS TRUE AND is_sale IS TRUE;

CREATE INDEX IF NOT EXISTS idx_products_approved_live
  ON public.products (approved)
  WHERE approved = 'yes' AND is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_products_category_live
  ON public.products (category)
  WHERE approved = 'yes' AND is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_products_created_at_live
  ON public.products (created_at DESC)
  WHERE approved = 'yes' AND is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_products_composition_lower_live
  ON public.products (lower(composition))
  WHERE approved = 'yes' AND is_active IS TRUE
    AND composition IS NOT NULL AND composition <> '';

-- -----------------------------------------------------------------------------
-- 4) Refresh helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.homepage_price_listed(
  p_price text,
  p_image_url text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    p_image_url IS NOT NULL
    AND trim(coalesce(p_image_url, '')) <> ''
    AND p_price IS NOT NULL
    AND trim(coalesce(p_price, '')) NOT IN ('', '$0.00', '0');
$$;

CREATE OR REPLACE FUNCTION public.homepage_style_base_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(both ' ' from lower(
    regexp_replace(
      coalesce(p_name, ''),
      '\s*-\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum|powder|midnight|heather|medium|deep|light|dark|washed|faded).*$',
      '',
      'i'
    )
  ));
$$;

-- Insert diversified picks into homepage_feed_items for one rail.
CREATE OR REPLACE FUNCTION public.homepage_feed_insert_picked(
  p_rail_key text,
  p_max_items smallint,
  p_max_per_brand smallint,
  p_source_sql text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted integer;
BEGIN
  DELETE FROM public.homepage_feed_items WHERE rail_key = p_rail_key;

  EXECUTE format($q$
    WITH src AS (%s),
    ranked AS (
      SELECT s.*, row_number() OVER (ORDER BY s.sort_ord) AS ord
      FROM src AS s
    ),
    diversified AS (
      SELECT r.*,
        row_number() OVER (PARTITION BY r.brand_slug ORDER BY r.ord) AS brand_ord,
        row_number() OVER (
          PARTITION BY public.homepage_style_base_name(r.name) ORDER BY r.ord
        ) AS style_ord
      FROM ranked AS r
    ),
    picked AS (
      SELECT d.*, row_number() OVER (ORDER BY d.ord) AS feed_rank
      FROM diversified AS d
      WHERE d.brand_ord <= %s AND d.style_ord = 1
      ORDER BY d.ord
      LIMIT %s
    )
    INSERT INTO public.homepage_feed_items (
      rail_key, rank, source_id, product_id, brand_slug, brand_name, name, url, image_url,
      price, natural_fiber_percent, category, is_sale
    )
    SELECT
      %L,
      p.feed_rank::smallint,
      p.id,
      p.product_id,
      p.brand_slug,
      p.brand_name,
      p.name,
      p.url,
      p.image_url,
      p.price,
      least(coalesce(p.natural_fiber_percent, 0)::integer, 32767)::smallint,
      p.category,
      coalesce(p.is_sale, false)
    FROM picked AS p
    ORDER BY p.feed_rank
  $q$, p_source_sql, p_max_per_brand, p_max_items, p_rail_key);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5) refresh_homepage_feeds()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_homepage_feeds()
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

  v_new_in_brands text[] := ARRAY[
    'frame', 'vince', 'theory', 'toteme', 'ganni', 'staud', 'khaite', 'isabel-marant'
  ];
  v_curated_brands text[] := ARRAY[
    'theory', 'rag-and-bone', 'vince', 'l-agence', 'frame',
    'khaite', 'toteme', 'loro-piana', 'staud', 'ganni',
    'velvet', 'fleur-du-mal', 'faithfull-the-brand', 'isabel-marant', 'diesel',
    'rails', 're-done', 'citizens-of-humanity', '7-for-all-mankind', 'splendid'
  ];
  v_homepage_brands text[];
  v_pool_limit constant integer := 120;
  v_new_in_source_limit constant integer := 32;
  v_sale_topup_limit constant integer := 24;
BEGIN
  SET LOCAL statement_timeout = '60s';

  v_homepage_brands := (
    SELECT array_agg(DISTINCT b ORDER BY b)
    FROM unnest(v_new_in_brands || v_curated_brands) AS b
  );

  -- Bounded brand pool (offline refresh only; mirrors phase-1 website pool).
  DROP TABLE IF EXISTS homepage_pool_raw;
  CREATE TEMP TABLE homepage_pool_raw ON COMMIT DROP AS
  SELECT
    l.id,
    l.product_id,
    l.brand_slug,
    l.brand_name,
    l.name,
    l.url,
    l.image_url,
    l.price,
    l.composition,
    l.natural_fiber_percent,
    l.category,
    l.region,
    l.is_sale,
    l.created_at,
    lower(coalesce(l.composition, '')) AS comp_l
  FROM public.live_products_apparel AS l
  WHERE l.brand_slug = ANY (v_homepage_brands)
    AND l.natural_fiber_percent >= 80
    AND public.homepage_price_listed(l.price, l.image_url)
  ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST
  LIMIT v_pool_limit;

  DROP TABLE IF EXISTS homepage_pool;
  CREATE TEMP TABLE homepage_pool ON COMMIT DROP AS
  SELECT *
  FROM (
    SELECT
      r.*,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          r.image_url, r.brand_name, r.name, r.composition, r.product_id, r.id
        )
        ORDER BY
          public.catalog_region_rank(r.region, 'us'),
          r.natural_fiber_percent DESC NULLS LAST,
          r.created_at DESC NULLS LAST
      ) AS dedupe_rn
    FROM homepage_pool_raw AS r
  ) AS d
  WHERE d.dedupe_rn = 1;

  DROP TABLE IF EXISTS homepage_new_in_src;
  CREATE TEMP TABLE homepage_new_in_src ON COMMIT DROP AS
  SELECT *
  FROM (
    SELECT
      l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
      l.composition, l.natural_fiber_percent, l.category, l.region, l.is_sale, l.created_at,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
        )
        ORDER BY
          public.catalog_region_rank(l.region, 'us'),
          l.created_at DESC NULLS LAST,
          l.natural_fiber_percent DESC NULLS LAST
      ) AS dedupe_rn
    FROM public.live_products_apparel AS l
    WHERE l.brand_slug = ANY (v_new_in_brands)
      AND l.natural_fiber_percent >= 80
      AND public.homepage_price_listed(l.price, l.image_url)
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT v_new_in_source_limit
  ) AS ni
  WHERE ni.dedupe_rn = 1;

  DROP TABLE IF EXISTS homepage_sale_src;
  CREATE TEMP TABLE homepage_sale_src ON COMMIT DROP AS
  SELECT *
  FROM (
    SELECT
      l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
      l.composition, l.natural_fiber_percent, l.category, l.region, l.is_sale, l.created_at,
      row_number() OVER (
        PARTITION BY public.catalog_dedupe_key(
          l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
        )
        ORDER BY
          public.catalog_region_rank(l.region, 'us'),
          l.natural_fiber_percent DESC NULLS LAST,
          l.created_at DESC NULLS LAST
      ) AS dedupe_rn
    FROM public.live_products_apparel AS l
    WHERE l.is_sale IS TRUE
      AND l.natural_fiber_percent >= 80
      AND public.homepage_price_listed(l.price, l.image_url)
    ORDER BY l.natural_fiber_percent DESC NULLS LAST
    LIMIT v_sale_topup_limit
  ) AS s
  WHERE s.dedupe_rn = 1;

  FOR v_rail IN
    SELECT * FROM public.homepage_merch_rails ORDER BY sort_order
  LOOP
    v_rail_started := clock_timestamp();

    IF NOT v_rail.enabled THEN
      DELETE FROM public.homepage_feed_items WHERE rail_key = v_rail.rail_key;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(), refresh_ms = 0, row_count = 0,
          source_rows = 0, last_error = NULL
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(v_rail.rail_key, jsonb_build_object('skipped', 'disabled'));
      CONTINUE;
    END IF;

    IF v_rail.refresh_strategy = 'designers_curated' THEN
      DELETE FROM public.homepage_feed_items WHERE rail_key = v_rail.rail_key;
      v_rail_ms := 0;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(), refresh_ms = v_rail_ms, row_count = 0,
          source_rows = 0, last_error = NULL
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(
        v_rail.rail_key, jsonb_build_object('rows', 0, 'note', 'designers table not cached here')
      );
      CONTINUE;
    END IF;

    IF v_rail.refresh_strategy = 'collection_canonical' THEN
      DELETE FROM public.homepage_feed_items WHERE rail_key = v_rail.rail_key;
      UPDATE public.homepage_feed_meta
      SET refreshed_at = clock_timestamp(), refresh_ms = 0, row_count = 0, source_rows = 0,
          last_error = 'collection_canonical not implemented — enable after editorial RPC wiring'
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(v_rail.rail_key, jsonb_build_object('rows', 0, 'pending', true));
      CONTINUE;
    END IF;

    BEGIN
      v_source_sql := NULL;

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
        SELECT * FROM homepage_pool WHERE is_sale IS TRUE
        UNION ALL
        SELECT s.* FROM homepage_sale_src AS s
        WHERE NOT EXISTS (SELECT 1 FROM homepage_pool AS p WHERE p.id = s.id);

        v_source_count := (SELECT COUNT(*)::integer FROM homepage_sale_candidates);
        v_source_sql := $sql$
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
              public.catalog_region_rank(c.region, 'us'),
              c.natural_fiber_percent DESC NULLS LAST,
              c.created_at DESC NULLS LAST
          ) AS c
        $sql$;

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
      SET refreshed_at = clock_timestamp(), refresh_ms = v_rail_ms,
          row_count = v_inserted::smallint, source_rows = v_source_count, last_error = NULL
      WHERE rail_key = v_rail.rail_key;

      v_result := v_result || jsonb_build_object(
        v_rail.rail_key,
        jsonb_build_object('rows', v_inserted, 'ms', v_rail_ms, 'strategy', v_rail.refresh_strategy)
      );

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      UPDATE public.homepage_feed_meta
      SET last_error = v_err, refresh_ms = NULL
      WHERE rail_key = v_rail.rail_key;
      v_result := v_result || jsonb_build_object(v_rail.rail_key, jsonb_build_object('error', v_err));
    END;
  END LOOP;

  v_global_ms := (extract(epoch FROM (clock_timestamp() - v_started_at)) * 1000)::integer;
  UPDATE public.homepage_feed_meta
  SET refreshed_at = clock_timestamp(), refresh_ms = v_global_ms, last_error = NULL
  WHERE rail_key = 'global';

  v_result := v_result || jsonb_build_object('global_ms', v_global_ms);
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.refresh_homepage_feeds() IS
  'Rebuild homepage_feed_items from live_products_apparel (cache refresh). '
  'Reads homepage_merch_rails registry; does not mutate products. '
  'Phase 2: switch per-rail refresh_strategy to collection_canonical in registry only.';

REVOKE ALL ON FUNCTION public.refresh_homepage_feeds() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_homepage_feeds() TO service_role;

GRANT EXECUTE ON FUNCTION public.homepage_feed_insert_picked(text, smallint, smallint, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 6) RLS + grants (public read cache; no client writes)
-- -----------------------------------------------------------------------------

ALTER TABLE public.homepage_merch_rails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_feed_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_feed_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read homepage_merch_rails" ON public.homepage_merch_rails;
CREATE POLICY "Public read homepage_merch_rails"
  ON public.homepage_merch_rails FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read homepage_feed_meta" ON public.homepage_feed_meta;
CREATE POLICY "Public read homepage_feed_meta"
  ON public.homepage_feed_meta FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read homepage_feed_items" ON public.homepage_feed_items;
CREATE POLICY "Public read homepage_feed_items"
  ON public.homepage_feed_items FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.homepage_merch_rails TO anon, authenticated;
GRANT SELECT ON public.homepage_feed_meta TO anon, authenticated;
GRANT SELECT ON public.homepage_feed_items TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- PREVIEW (read-only — after apply + manual refresh)
-- -----------------------------------------------------------------------------
-- SELECT public.refresh_homepage_feeds();
-- SELECT rail_key, axis, slug, enabled, refresh_strategy, canonical_collection_slug
-- FROM public.homepage_merch_rails ORDER BY sort_order;
-- SELECT rail_key, row_count, source_rows, refresh_ms, refreshed_at, last_error
-- FROM public.homepage_feed_meta ORDER BY rail_key;
-- SELECT rail_key, COUNT(*) FROM public.homepage_feed_items GROUP BY 1 ORDER BY 1;

-- -----------------------------------------------------------------------------
-- ROLLBACK
-- -----------------------------------------------------------------------------
-- REVOKE EXECUTE ON FUNCTION public.refresh_homepage_feeds() FROM service_role;
-- REVOKE EXECUTE ON FUNCTION public.homepage_feed_insert_picked(text, smallint, smallint, text) FROM service_role;
-- DROP FUNCTION IF EXISTS public.refresh_homepage_feeds();
-- DROP FUNCTION IF EXISTS public.homepage_feed_insert_picked(text, smallint, smallint, text);
-- DROP FUNCTION IF EXISTS public.homepage_style_base_name;
-- DROP FUNCTION IF EXISTS public.homepage_price_listed;
-- DROP TABLE IF EXISTS public.homepage_feed_items;
-- DROP TABLE IF EXISTS public.homepage_feed_meta;
-- DROP TABLE IF EXISTS public.homepage_merch_rails;
-- DROP INDEX IF EXISTS idx_products_composition_lower_live;
-- DROP INDEX IF EXISTS idx_products_created_at_live;
-- DROP INDEX IF EXISTS idx_products_category_live;
-- DROP INDEX IF EXISTS idx_products_approved_live;
-- DROP INDEX IF EXISTS idx_products_is_sale_live;
-- DROP INDEX IF EXISTS idx_products_new_in_live;
-- DROP INDEX IF EXISTS idx_products_brand_slug_live;

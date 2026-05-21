-- =============================================================================
-- Fix Valentino (and similar) on fabrics:silk — run in order, one tab each
-- Prereq: 20240022 + 20240023 + 20240024 applied in Supabase
-- =============================================================================

-- STEP 1 — Confirm parser sees cotton (not silk) for the feed row
SELECT
  h.source_id,
  h.brand_name,
  h.name,
  left(l.composition, 500) AS composition,
  public.catalog_parse_composition_material(l.composition, l.material_metadata) AS parsed,
  public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'silk') AS silk_eligible
FROM public.homepage_feed_items h
JOIN public.live_products_apparel l ON l.id = h.source_id
WHERE h.rail_key = 'fabrics:silk'
  AND lower(h.name) LIKE '%cotton%poplin%'
  AND lower(h.brand_name) LIKE '%valentino%';

-- STEP 2 — Remove ineligible rows from silk cache (does not touch products)
SELECT public.homepage_feed_purge_ineligible_material_rail('fabrics:silk'::text) AS purged_rows;

-- STEP 3 — Rebuild silk rail from body-eligible offers only
SET statement_timeout = '90s';
DO $$
DECLARE v_ins int; v_cnt int;
BEGIN
  DROP TABLE IF EXISTS _src;
  CREATE TEMP TABLE _src ON COMMIT DROP AS
  SELECT l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
    l.natural_fiber_percent, l.category, l.is_sale, l.created_at,
    row_number() OVER (ORDER BY l.natural_fiber_percent DESC NULLS LAST) AS sort_ord
  FROM public.live_products_apparel l
  WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'silk')
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'fabrics:silk'::text, 32::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'fabrics:silk';
END $$;

-- STEP 4 — Must be 0
SELECT COUNT(*)::int AS valentino_cotton_on_silk_feed
FROM public.homepage_feed_items h
JOIN public.live_products_apparel l ON l.id = h.source_id
WHERE h.rail_key = 'fabrics:silk'
  AND lower(h.name) LIKE '%cotton%poplin%'
  AND lower(h.brand_name) LIKE '%valentino%';

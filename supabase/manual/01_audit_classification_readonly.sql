-- =============================================================================
-- STEP 1 — Read-only audit: live consumer catalog completeness
-- No INSERT/UPDATE/DELETE. Run ONE section per tab if Disk IO is tight.
-- Prereq: 20240020 consumer scope views applied.
-- =============================================================================

SET statement_timeout = '180s';

-- -----------------------------------------------------------------------------
-- A) Prerequisites
-- -----------------------------------------------------------------------------
SELECT 'live_products_apparel' AS check_name,
  EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'live_products_apparel') AS ok;

SELECT 'catalog_consumer_exclusion_reason' AS check_name,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_consumer_exclusion_reason') AS ok;

-- -----------------------------------------------------------------------------
-- B) Volume baseline
-- -----------------------------------------------------------------------------
SELECT 'products_total' AS metric, COUNT(*)::bigint AS n FROM public.products;

SELECT 'live_products' AS metric, COUNT(*)::bigint AS n FROM public.live_products;

SELECT 'live_products_apparel' AS metric, COUNT(*)::bigint AS n FROM public.live_products_apparel;

SELECT 'catalog_scope_summary' AS section, catalog_scope, COUNT(*)::bigint AS n
FROM public.products_catalog_scope
GROUP BY catalog_scope
ORDER BY n DESC;

-- -----------------------------------------------------------------------------
-- C) Women's apparel gate (approved active excluded from apparel view)
-- -----------------------------------------------------------------------------
SELECT 'approved_active_excluded_reason' AS section,
  public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) AS reason,
  COUNT(*)::bigint AS n
FROM public.products p
WHERE p.approved = 'yes' AND coalesce(p.is_active, true) IS TRUE
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NOT NULL
GROUP BY 1
ORDER BY n DESC;

-- -----------------------------------------------------------------------------
-- D) Completeness gaps on LIVE apparel (consumer-facing today)
-- -----------------------------------------------------------------------------
SELECT 'missing_image' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.image_url IS NULL OR trim(l.image_url) = '';

SELECT 'missing_price' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.price IS NULL OR trim(l.price) = '';

SELECT 'missing_url' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.url IS NULL OR trim(l.url) = ''
   OR NOT public.catalog_product_url_valid(l.url);

SELECT 'missing_currency' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.currency IS NULL OR trim(coalesce(l.currency, '')) = '';

SELECT 'missing_composition' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.composition IS NULL OR trim(l.composition) = '';

SELECT 'missing_category' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.category IS NULL OR trim(l.category) = '';

SELECT 'nfp_below_80' AS metric, COUNT(*)::bigint AS n
FROM public.products p
WHERE p.approved = 'yes' AND coalesce(p.is_active, true) IS TRUE
  AND coalesce(p.natural_fiber_percent, 0) < 80
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NULL;

-- -----------------------------------------------------------------------------
-- E) Material signal (composition ILIKE — pre-classification)
-- -----------------------------------------------------------------------------
SELECT 'fiber_signal' AS section, fiber, COUNT(*)::bigint AS n
FROM (
  SELECT l.id,
    CASE
      WHEN lower(coalesce(l.composition, '')) ~ '(silk|mulberry)' THEN 'silk'
      WHEN lower(coalesce(l.composition, '')) ~ '(cashmere)' THEN 'cashmere'
      WHEN lower(coalesce(l.composition, '')) ~ '(wool|merino|lambswool)' THEN 'wool'
      WHEN lower(coalesce(l.composition, '')) ~ '(linen|flax)' THEN 'linen'
      WHEN lower(coalesce(l.composition, '')) ~ '(cotton)' THEN 'cotton'
      WHEN lower(coalesce(l.composition, '')) ~ '(leather|suede)' THEN 'leather_suede'
      WHEN lower(coalesce(l.composition, '')) ~ '(viscose|rayon|cupro|modal|lyocell|tencel)' THEN 'viscose_rayon'
      WHEN lower(coalesce(l.composition, '')) ~ '(polyester|nylon|acrylic|elastane|spandex)' THEN 'synthetic_blend'
      ELSE 'unknown_or_mixed'
    END AS fiber
  FROM public.live_products_apparel l
) s
GROUP BY fiber
ORDER BY n DESC;

-- -----------------------------------------------------------------------------
-- F) Garment signal (category tokens — pre-classification)
-- -----------------------------------------------------------------------------
SELECT 'garment_signal' AS section, garment, COUNT(*)::bigint AS n
FROM (
  SELECT l.id,
    CASE
      WHEN lower(coalesce(l.category, '')) ~ '(dress|gown)' THEN 'dresses'
      WHEN lower(coalesce(l.category, '')) ~ '(blouse|top|tank|bodysuit)' THEN 'tops_blouses'
      WHEN lower(coalesce(l.category, '')) ~ '(shirt)' AND lower(coalesce(l.category, '')) !~ 't-shirt' THEN 'shirts'
      WHEN lower(coalesce(l.category, '')) ~ '(knit|sweater|cardigan|pullover|jumper)' THEN 'knitwear'
      WHEN lower(coalesce(l.category, '')) ~ '(pant|trouser|jean|denim)' THEN 'pants_trousers'
      WHEN lower(coalesce(l.category, '')) ~ '(skirt)' THEN 'skirts'
      WHEN lower(coalesce(l.category, '')) ~ '(short)' THEN 'shorts'
      WHEN lower(coalesce(l.category, '')) ~ '(blazer|jacket)' THEN 'jackets_blazers'
      WHEN lower(coalesce(l.category, '')) ~ '(coat|outerwear|parka|trench)' THEN 'coats'
      WHEN lower(coalesce(l.category, '')) ~ '(swim|bikini|resort)' THEN 'swim_resortwear'
      WHEN lower(coalesce(l.category, '')) ~ '(scarf|wrap|shawl)' THEN 'scarves_wraps'
      WHEN lower(coalesce(l.category, '')) ~ '(set|co-ord|coord)' THEN 'matching_sets'
      WHEN trim(coalesce(l.category, '')) = '' THEN 'needs_review'
      ELSE 'other_apparel'
    END AS garment
  FROM public.live_products_apparel l
) g
GROUP BY garment
ORDER BY n DESC;

-- -----------------------------------------------------------------------------
-- G) Regional duplicate / canonical pressure (requires catalog_dedupe_key)
-- -----------------------------------------------------------------------------
SELECT 'catalog_dedupe_key' AS check_name,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_dedupe_key') AS ok;

-- Run only if ok = true:
-- SELECT 'dedupe_groups' AS metric, COUNT(DISTINCT public.catalog_dedupe_key(
--   l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id))::bigint AS n
-- FROM public.live_products_apparel l;
--
-- SELECT 'multi_row_dedupe_groups' AS metric, COUNT(*)::bigint AS n
-- FROM (
--   SELECT public.catalog_dedupe_key(l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id) AS k
--   FROM public.live_products_apparel l
--   GROUP BY 1 HAVING COUNT(*) > 1
-- ) d;

-- -----------------------------------------------------------------------------
-- H) Homepage cache vs live apparel
-- -----------------------------------------------------------------------------
SELECT 'homepage_feed_meta' AS section, rail_key, row_count, source_rows, refreshed_at, last_error
FROM public.homepage_feed_meta
WHERE rail_key <> 'global'
ORDER BY rail_key;

SELECT 'homepage_feed_items_by_rail' AS section, rail_key, COUNT(*)::bigint AS n
FROM public.homepage_feed_items
GROUP BY rail_key
ORDER BY rail_key;

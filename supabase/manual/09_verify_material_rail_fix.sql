-- =============================================================================
-- Verify material body parser + fabric rail fix (read-only)
-- Prereq: 20240022 applied; rails refreshed after fix
-- =============================================================================

SET statement_timeout = '180s';

-- -----------------------------------------------------------------------------
-- 1) Valentino Cotton Poplin — must NOT be silk-eligible
-- -----------------------------------------------------------------------------
SELECT 'valentino_poplin_parse' AS check_name,
  l.name,
  l.composition,
  public.catalog_parse_composition_material(l.composition, l.material_metadata) AS parsed,
  public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'silk') AS silk_eligible,
  public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'cotton') AS cotton_eligible
FROM public.live_products_apparel l
WHERE lower(l.name) LIKE '%valentino%cotton%poplin%'
   OR (lower(l.brand_name) LIKE '%valentino%' AND lower(l.name) LIKE '%cotton%poplin%')
LIMIT 5;

-- -----------------------------------------------------------------------------
-- 2) Before/after style counts (naive ILIKE vs body parser on live apparel)
-- -----------------------------------------------------------------------------
SELECT 'naive_silk_ilike' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE lower(coalesce(l.composition, '')) ~ '(silk|mulberry)';

SELECT 'body_parser_silk_eligible' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'silk');

SELECT 'naive_cotton_ilike' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE lower(coalesce(l.composition, '')) ~ '(cotton)';

SELECT 'body_parser_cotton_eligible' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'cotton');

SELECT 'body_parser_linen' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'linen');

SELECT 'body_parser_cashmere' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'cashmere');

SELECT 'body_parser_wool' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'wool');

SELECT 'needs_material_review' AS method, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE coalesce(
  (public.catalog_parse_composition_material(l.composition, l.material_metadata)->>'needs_material_review')::boolean,
  true
);

-- -----------------------------------------------------------------------------
-- 3) False positives removed from silk (had silk only in trim/embroidery)
-- -----------------------------------------------------------------------------
SELECT 'silk_false_positive_candidates' AS section,
  l.brand_name, l.name, left(l.composition, 200) AS composition_snip,
  public.catalog_parse_composition_material(l.composition, l.material_metadata)->>'primary_material' AS primary_material,
  public.catalog_parse_composition_material(l.composition, l.material_metadata)->'secondary_materials' AS secondary_materials
FROM public.live_products_apparel l
WHERE lower(coalesce(l.composition, '')) ~ '(silk|mulberry)'
  AND NOT public.catalog_material_rail_eligible(l.composition, l.material_metadata, 'silk')
ORDER BY l.brand_name, l.name
LIMIT 25;

-- -----------------------------------------------------------------------------
-- 4) Homepage silk rail should not include valentino poplin
-- -----------------------------------------------------------------------------
SELECT 'silk_feed_valentino_check' AS section, h.brand_name, h.name, h.source_id
FROM public.homepage_feed_items h
JOIN public.live_products_apparel l ON l.id = h.source_id
WHERE h.rail_key = 'fabrics:silk'
  AND (lower(h.name) LIKE '%valentino%cotton%poplin%'
    OR (lower(h.brand_name) LIKE '%valentino%' AND lower(h.name) LIKE '%cotton%poplin%'));

SELECT 'homepage_feed_meta_fabrics' AS section, rail_key, row_count, source_rows, refreshed_at
FROM public.homepage_feed_meta
WHERE rail_key LIKE 'fabrics:%'
ORDER BY rail_key;

SELECT 'homepage_feed_items_fabrics' AS section, rail_key, COUNT(*)::bigint AS n
FROM public.homepage_feed_items
WHERE rail_key LIKE 'fabrics:%'
GROUP BY rail_key ORDER BY rail_key;

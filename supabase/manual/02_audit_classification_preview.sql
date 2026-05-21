-- =============================================================================
-- STEP 2 — Preview counts: material / garment / rail (READ ONLY, no DDL)
-- Run ONE SELECT block per tab if Disk IO is tight.
-- After 20240021 applied, uncomment section A for authoritative counts.
-- =============================================================================

SET statement_timeout = '180s';

-- -----------------------------------------------------------------------------
-- A) After 20240021 applied (uncomment)
-- -----------------------------------------------------------------------------
-- SELECT 'material_primary' AS section,
--   public.catalog_classify_material(l.composition, l.material_metadata) AS v,
--   COUNT(*)::bigint AS n
-- FROM public.live_products_apparel l
-- GROUP BY 1 ORDER BY n DESC;
--
-- SELECT 'garment_type' AS section,
--   public.catalog_classify_garment(l.category, l.name) AS v,
--   COUNT(*)::bigint AS n
-- FROM public.live_products_apparel l
-- GROUP BY 1 ORDER BY n DESC;
--
-- SELECT 'completeness_status' AS section,
--   public.catalog_offer_completeness_status(
--     l.category, l.name, l.composition, l.image_url, l.price, l.url, l.currency
--   ) AS v,
--   COUNT(*)::bigint AS n
-- FROM public.live_products_apparel l
-- GROUP BY 1 ORDER BY n DESC;
--
-- SELECT 'rail_key' AS section, r.rail_key, COUNT(*)::bigint AS n
-- FROM public.live_products_apparel l,
--   LATERAL unnest(public.catalog_infer_rail_keys(
--     public.catalog_classify_material(l.composition, l.material_metadata),
--     l.collection_slugs, l.is_sale, l.brand_slug, l.created_at
--   )) AS r(rail_key)
-- GROUP BY r.rail_key ORDER BY n DESC;

-- -----------------------------------------------------------------------------
-- B) Inline preview (before 20240021 — mirrors migration rules)
-- -----------------------------------------------------------------------------
SELECT 'preview_material_primary' AS section, material_primary, COUNT(*)::bigint AS n
FROM (
  SELECT
    CASE
      WHEN lower(coalesce(l.composition, '')) ~ '(silk|mulberry)' THEN 'silk'
      WHEN lower(coalesce(l.composition, '')) ~ '(cashmere)' THEN 'cashmere'
      WHEN lower(coalesce(l.composition, '')) ~ '(wool|merino|lambswool)' THEN 'wool'
      WHEN lower(coalesce(l.composition, '')) ~ '(linen|flax)' THEN 'linen'
      WHEN lower(coalesce(l.composition, '')) ~ '(cotton)' THEN 'cotton'
      WHEN lower(coalesce(l.composition, '')) ~ '(leather|suede)' THEN 'leather_suede'
      WHEN lower(coalesce(l.composition, '')) ~ '(viscose|rayon|cupro|modal|lyocell|tencel)' THEN 'viscose_rayon'
      WHEN lower(coalesce(l.composition, '')) ~ '(polyester|nylon|acrylic|elastane|spandex)' THEN 'synthetic_blend'
      ELSE 'unknown_material'
    END AS material_primary
  FROM public.live_products_apparel l
) m
GROUP BY material_primary
ORDER BY n DESC;

SELECT 'preview_garment_type' AS section, garment_type, COUNT(*)::bigint AS n
FROM (
  SELECT
    CASE
      WHEN trim(coalesce(l.category, '')) = '' THEN 'needs_review'
      WHEN lower(l.category) ~ '(dress|gown)' THEN 'dresses'
      WHEN lower(l.category) ~ '(blouse|bodysuit|tank|camisole)' THEN 'tops_blouses'
      WHEN lower(l.category) ~ '(^|[^a-z])top([^a-z]|$)' THEN 'tops_blouses'
      WHEN lower(l.category) ~ '(shirt)' AND lower(l.category) !~ 't-shirt' THEN 'shirts'
      WHEN lower(l.category) ~ '(knit)' THEN 'knitwear'
      WHEN lower(l.category) ~ '(sweater|cardigan|pullover|jumper)' THEN 'sweaters_cardigans'
      WHEN lower(l.category) ~ '(pant|trouser|jean|denim)' THEN 'pants_trousers'
      WHEN lower(l.category) ~ '(skirt)' THEN 'skirts'
      WHEN lower(l.category) ~ '(short)' THEN 'shorts'
      WHEN lower(l.category) ~ '(blazer|jacket)' THEN 'jackets_blazers'
      WHEN lower(l.category) ~ '(coat|outerwear|parka|trench)' THEN 'coats'
      WHEN lower(l.category) ~ '(swim|bikini|resort)' THEN 'swim_resortwear'
      WHEN lower(l.category) ~ '(scarf|wrap|shawl)' THEN 'scarves_wraps'
      WHEN lower(l.category) ~ '(set|co-ord|coord)' THEN 'matching_sets'
      ELSE 'other_apparel'
    END AS garment_type
  FROM public.live_products_apparel l
) g
GROUP BY garment_type
ORDER BY n DESC;

SELECT 'preview_rail_key' AS section, rail_key, COUNT(*)::bigint AS n
FROM (
  SELECT l.id, rk AS rail_key
  FROM public.live_products_apparel l
  CROSS JOIN LATERAL (
    SELECT unnest(
      ARRAY_REMOVE(ARRAY[
        CASE WHEN lower(coalesce(l.composition, '')) ~ '(silk|mulberry)' THEN 'fabrics:silk' END,
        CASE WHEN lower(coalesce(l.composition, '')) ~ '(linen|flax)' THEN 'fabrics:linen' END,
        CASE WHEN lower(coalesce(l.composition, '')) ~ '(cashmere)' THEN 'fabrics:cashmere' END,
        CASE WHEN lower(coalesce(l.composition, '')) ~ '(wool|merino|lambswool)' THEN 'fabrics:wool' END,
        CASE WHEN lower(coalesce(l.composition, '')) ~ '(cotton)' THEN 'fabrics:cotton' END,
        CASE WHEN lower(coalesce(l.composition, '')) ~ '(leather|suede)' THEN 'fabrics:leather-suede' END,
        CASE WHEN l.collection_slugs && ARRAY['vacation-shop','vacation-edit']::text[] THEN 'collections:vacation' END,
        CASE WHEN l.collection_slugs && ARRAY['evening-edit','evening']::text[] THEN 'collections:evening' END,
        CASE WHEN l.collection_slugs && ARRAY['tailoring-edit','tailoring']::text[] THEN 'collections:tailoring' END,
        CASE WHEN l.collection_slugs && ARRAY['white-edit','the-white-edit']::text[] THEN 'collections:white-edit' END,
        CASE WHEN l.collection_slugs && ARRAY['city-wardrobe','summer-in-the-city']::text[] THEN 'collections:summer-in-the-city' END,
        CASE WHEN l.is_sale IS TRUE THEN 'sale:all' END,
        CASE WHEN l.brand_slug = ANY (ARRAY[
          'frame','vince','theory','toteme','ganni','staud','khaite','isabel-marant',
          'rag-and-bone','citizens-of-humanity','reformation','nili-lotan'
        ]::text[]) AND l.created_at >= (now() - interval '90 days') THEN 'top:new_in' END
      ], NULL)
    ) AS rk
  ) rails
) r
GROUP BY rail_key
ORDER BY n DESC;

-- -----------------------------------------------------------------------------
-- C) Visible-card duplicate preview (requires catalog_dedupe_key)
-- -----------------------------------------------------------------------------
SELECT 'visible_card_pressure' AS metric,
  COUNT(*)::bigint AS offer_rows,
  COUNT(DISTINCT public.catalog_dedupe_key(
    l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
  ))::bigint AS distinct_visible_cards,
  (COUNT(*) - COUNT(DISTINCT public.catalog_dedupe_key(
    l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
  )))::bigint AS duplicate_slots_without_canonical
FROM public.live_products_apparel l;

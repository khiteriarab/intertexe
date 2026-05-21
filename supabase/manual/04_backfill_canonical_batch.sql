-- =============================================================================
-- STEP 5 — Canonical grouping (BATCHED)
-- Prereq: 03 offer classification complete (or partial). No product deletes.
-- =============================================================================

SET statement_timeout = '300s';

-- -----------------------------------------------------------------------------
-- A) Insert canonical_products (distinct style_key from live apparel)
-- Run repeatedly with LIMIT until insert count = 0
-- -----------------------------------------------------------------------------
INSERT INTO public.canonical_products (
  style_key, brand_slug, style_name, image_url_norm, composition_norm,
  material_primary, garment_type, primary_fibers, natural_fiber_percent, updated_at
)
SELECT DISTINCT ON (sk)
  sk AS style_key,
  l.brand_slug,
  public.homepage_style_base_name(l.name) AS style_name,
  public.catalog_image_url_norm(l.image_url),
  lower(trim(regexp_replace(coalesce(l.composition, ''), '\s+', ' ', 'g'))) AS composition_norm,
  coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata)),
  coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name)),
  ARRAY[coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata))]::text[],
  l.natural_fiber_percent::smallint,
  now()
FROM public.live_products_apparel l
LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
CROSS JOIN LATERAL (
  SELECT public.catalog_style_key(l.image_url, l.brand_slug, l.name, l.composition) AS sk
) k
WHERE NOT EXISTS (
  SELECT 1 FROM public.canonical_products cp WHERE cp.style_key = k.sk
)
LIMIT 5000
ON CONFLICT (style_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- B) Link products.canonical_id (batched — repeat until linked_remaining = 0)
-- -----------------------------------------------------------------------------
WITH batch AS (
  SELECT p.id, cp.canonical_id
  FROM public.products p
  JOIN public.live_products_apparel l ON l.id = p.id
  JOIN public.canonical_products cp ON cp.style_key = public.catalog_style_key(
    l.image_url, l.brand_slug, l.name, l.composition
  )
  WHERE p.canonical_id IS NULL
  LIMIT 5000
)
UPDATE public.products p
SET canonical_id = b.canonical_id
FROM batch b
WHERE p.id = b.id;

-- -----------------------------------------------------------------------------
-- C) Sync classification.canonical_id
-- -----------------------------------------------------------------------------
UPDATE public.product_offer_classification c
SET canonical_id = p.canonical_id
FROM public.products p
WHERE p.id = c.offer_id
  AND c.canonical_id IS DISTINCT FROM p.canonical_id;

-- -----------------------------------------------------------------------------
-- D) Rebuild canonical-level facts (truncate + insert — derived only)
-- -----------------------------------------------------------------------------
TRUNCATE public.product_material_facts;
INSERT INTO public.product_material_facts (canonical_id, material_primary, fiber_tags, is_leather_suede)
SELECT
  cp.canonical_id,
  mode() WITHIN GROUP (ORDER BY c.material_primary) AS material_primary,
  array_agg(DISTINCT c.material_primary) AS fiber_tags,
  bool_or(c.material_primary = 'leather_suede')
FROM public.canonical_products cp
JOIN public.products p ON p.canonical_id = cp.canonical_id
JOIN public.product_offer_classification c ON c.offer_id = p.id
WHERE c.completeness_status = 'complete'
GROUP BY cp.canonical_id;

TRUNCATE public.product_garment_facts;
INSERT INTO public.product_garment_facts (canonical_id, garment_type)
SELECT
  cp.canonical_id,
  mode() WITHIN GROUP (ORDER BY c.garment_type) AS garment_type
FROM public.canonical_products cp
JOIN public.products p ON p.canonical_id = cp.canonical_id
JOIN public.product_offer_classification c ON c.offer_id = p.id
WHERE c.completeness_status = 'complete'
GROUP BY cp.canonical_id;

UPDATE public.canonical_products cp
SET
  material_primary = mf.material_primary,
  garment_type = gf.garment_type,
  primary_fibers = mf.fiber_tags,
  updated_at = now()
FROM public.product_material_facts mf
JOIN public.product_garment_facts gf ON gf.canonical_id = mf.canonical_id
WHERE cp.canonical_id = mf.canonical_id;

-- Progress
SELECT
  (SELECT COUNT(*)::bigint FROM public.live_products_apparel) AS live_offers,
  (SELECT COUNT(*)::bigint FROM public.canonical_products) AS canonical_rows,
  (SELECT COUNT(*)::bigint FROM public.products p
    JOIN public.live_products_apparel l ON l.id = p.id WHERE p.canonical_id IS NOT NULL) AS linked_offers,
  (SELECT COUNT(*)::bigint FROM public.products p
    JOIN public.live_products_apparel l ON l.id = p.id WHERE p.canonical_id IS NULL) AS unlinked_offers;

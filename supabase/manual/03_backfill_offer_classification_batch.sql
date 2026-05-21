-- =============================================================================
-- STEP 4a — Backfill product_offer_classification (BATCHED)
-- Prereq: 20240021 applied. Run ONE batch per session. Tune batch size to IO.
-- Does NOT modify composition, tags, collection_slugs, or approved.
-- =============================================================================

SET statement_timeout = '300s';

-- Set batch window (edit before each run):
--   :batch_min_id and :batch_max_id are UUIDs from products.id ordering
-- First run preview:
SELECT MIN(id) AS min_id, MAX(id) AS max_id, COUNT(*)::bigint AS n
FROM public.live_products_apparel;

-- Example batch (replace UUIDs after preview):
/*
WITH batch AS (
  SELECT l.*
  FROM public.live_products_apparel l
  WHERE l.id >= '00000000-0000-0000-0000-000000000001'::uuid
    AND l.id <  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
)
INSERT INTO public.product_offer_classification (
  offer_id,
  material_primary,
  material_tags,
  garment_type,
  completeness_status,
  needs_review_reason,
  inferred_rail_keys,
  classifier_version,
  classified_at
)
SELECT
  b.id,
  public.catalog_classify_material(b.composition, b.material_metadata),
  ARRAY[public.catalog_classify_material(b.composition, b.material_metadata)]::text[],
  public.catalog_classify_garment(b.category, b.name),
  public.catalog_offer_completeness_status(
    b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
  ),
  public.catalog_offer_needs_review_reason(
    b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
  ),
  public.catalog_infer_rail_keys(
    public.catalog_classify_material(b.composition, b.material_metadata),
    b.collection_slugs,
    b.is_sale,
    b.brand_slug,
    b.created_at
  ),
  'v1',
  now()
FROM batch b
ON CONFLICT (offer_id) DO UPDATE SET
  material_primary = EXCLUDED.material_primary,
  material_tags = EXCLUDED.material_tags,
  garment_type = EXCLUDED.garment_type,
  completeness_status = EXCLUDED.completeness_status,
  needs_review_reason = EXCLUDED.needs_review_reason,
  inferred_rail_keys = EXCLUDED.inferred_rail_keys,
  classifier_version = EXCLUDED.classifier_version,
  classified_at = now();
*/

-- Safer: keyed batch by ctid slice (run repeatedly until 0 rows)
DO $$
DECLARE
  v_batch int := 3000;
  v_done int;
BEGIN
  WITH batch AS (
    SELECT l.*
    FROM public.live_products_apparel l
    LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
    WHERE c.offer_id IS NULL
    LIMIT v_batch
  )
  INSERT INTO public.product_offer_classification (
    offer_id, material_primary, material_tags, garment_type,
    completeness_status, needs_review_reason, inferred_rail_keys,
    classifier_version, classified_at
  )
  SELECT
    b.id,
    public.catalog_classify_material(b.composition, b.material_metadata),
    ARRAY[public.catalog_classify_material(b.composition, b.material_metadata)]::text[],
    public.catalog_classify_garment(b.category, b.name),
    public.catalog_offer_completeness_status(
      b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
    ),
    public.catalog_offer_needs_review_reason(
      b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
    ),
    public.catalog_infer_rail_keys(
      public.catalog_classify_material(b.composition, b.material_metadata),
      b.collection_slugs, b.is_sale, b.brand_slug, b.created_at
    ),
    'v1', now()
  FROM batch b
  ON CONFLICT (offer_id) DO NOTHING;

  GET DIAGNOSTICS v_done = ROW_COUNT;
  RAISE NOTICE 'classified_batch_rows=%', v_done;
END $$;

-- Progress check (re-run until remaining = 0)
SELECT COUNT(*)::bigint AS remaining_unclassified
FROM public.live_products_apparel l
LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
WHERE c.offer_id IS NULL;

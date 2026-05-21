-- =============================================================================
-- Rebuild material classification + fabric rails + homepage cache
-- Prereq: 20240022_catalog_material_body_parse.sql applied
-- Run ONE section per SQL Editor tab (Disk IO). No source composition writes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Apply migration first (paste 20240022 in separate run if not applied)
-- -----------------------------------------------------------------------------

SET statement_timeout = '300s';

-- -----------------------------------------------------------------------------
-- 1) Reclassify all live apparel offers (batched — repeat until remaining = 0)
-- -----------------------------------------------------------------------------
DO $$
DECLARE v_batch int := 3000; v_done int;
BEGIN
  WITH batch AS (
    SELECT l.*
    FROM public.live_products_apparel l
    LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
    WHERE c.classifier_version IS DISTINCT FROM 'v2_body_parse'
    LIMIT v_batch
  ),
  parsed AS (
    SELECT
      b.id,
      public.catalog_parse_composition_material(b.composition, b.material_metadata) AS m
    FROM batch b
  )
  INSERT INTO public.product_offer_classification (
    offer_id, material_primary, material_tags, garment_type,
    completeness_status, needs_review_reason, inferred_rail_keys,
    primary_material, primary_material_percent, secondary_materials,
    material_component_notes, material_classification_confidence, needs_material_review,
    classifier_version, classified_at
  )
  SELECT
    b.id,
    p.m->>'primary_material',
    ARRAY[p.m->>'primary_material']::text[],
    public.catalog_classify_garment(b.category, b.name),
    public.catalog_offer_completeness_status(
      b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
    ),
    public.catalog_offer_needs_review_reason(
      b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
    ),
    public.catalog_infer_rail_keys_from_composition(
      b.composition, b.material_metadata, b.collection_slugs, b.is_sale, b.brand_slug, b.created_at
    ),
    p.m->>'primary_material',
    nullif(p.m->>'primary_material_percent', '')::smallint,
    coalesce(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p.m->'secondary_materials', '[]'::jsonb)) AS x),
      '{}'::text[]
    ),
    p.m->>'material_component_notes',
    coalesce((p.m->>'material_classification_confidence')::smallint, 0),
    coalesce((p.m->>'needs_material_review')::boolean, true),
    'v2_body_parse',
    now()
  FROM batch b
  JOIN parsed p ON p.id = b.id
  ON CONFLICT (offer_id) DO UPDATE SET
    material_primary = EXCLUDED.material_primary,
    material_tags = EXCLUDED.material_tags,
    garment_type = EXCLUDED.garment_type,
    completeness_status = EXCLUDED.completeness_status,
    needs_review_reason = EXCLUDED.needs_review_reason,
    inferred_rail_keys = EXCLUDED.inferred_rail_keys,
    primary_material = EXCLUDED.primary_material,
    primary_material_percent = EXCLUDED.primary_material_percent,
    secondary_materials = EXCLUDED.secondary_materials,
    material_component_notes = EXCLUDED.material_component_notes,
    material_classification_confidence = EXCLUDED.material_classification_confidence,
    needs_material_review = EXCLUDED.needs_material_review,
    classifier_version = EXCLUDED.classifier_version,
    classified_at = now();

  GET DIAGNOSTICS v_done = ROW_COUNT;
  RAISE NOTICE 'reclassified_rows=%', v_done;
END $$;

-- If product_offer_classification does not exist yet, skip to refresh_one_rail_at_a_time.sql
-- using catalog_material_rail_eligible() directly (section 3).

-- -----------------------------------------------------------------------------
-- 2) Rebuild fabric rail membership (canonical-linked offers only)
-- -----------------------------------------------------------------------------
TRUNCATE public.product_rail_membership;

INSERT INTO public.product_rail_membership (canonical_id, rail_key, source, priority, active)
SELECT DISTINCT p.canonical_id, rk, 'derived_v2_body', 100::smallint, true
FROM public.products p
JOIN public.product_offer_classification c ON c.offer_id = p.id
CROSS JOIN LATERAL unnest(c.inferred_rail_keys) AS rk
WHERE p.canonical_id IS NOT NULL
  AND c.completeness_status = 'complete'
  AND c.needs_material_review IS NOT TRUE
  AND (rk LIKE 'fabrics:%' OR rk LIKE 'collections:%' OR rk IN ('sale:all', 'top:new_in'))
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3) Refresh fabric homepage rails (body-eligible only) — ONE rail per run
-- Copy each block from refresh_one_rail_at_a_time.sql after it is updated, or:
-- =============================================================================

-- BLOCK A silk
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

-- Repeat for linen/cashmere/wool/cotton/leather using refresh_one_rail_at_a_time.sql blocks B–E

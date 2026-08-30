-- Tops parent: direct high-confidence assignments + active descendants.
-- T-shirts leaf (inactive pending QA). Shirts/tanks remain inactive.
-- Parent filter_slugs always includes the parent slug for direct assignments (deduped).

INSERT INTO public.catalog_taxonomy_nodes (
  slug, parent_slug, department, label, sort_order, is_active, is_provisional, min_count_threshold
)
VALUES ('clothing/t-shirts', 'clothing/tops', 'clothing', 'T-Shirts', 24, false, false, 50)
ON CONFLICT (slug) DO UPDATE SET
  parent_slug = EXCLUDED.parent_slug,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Parent browse = direct parent assignments ∪ active descendant slugs (deduped).
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_filter_slugs(p_slug text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  s text := trim(coalesce(p_slug, ''));
  descendants text[];
BEGIN
  IF s = '' THEN RETURN NULL; END IF;
  IF s IN ('clothing/all', 'shoes/all') THEN RETURN NULL; END IF;

  descendants := public.catalog_taxonomy_active_descendant_slugs(s);

  RETURN (
    SELECT coalesce(array_agg(DISTINCT x ORDER BY x), ARRAY[]::text[])
    FROM unnest(array_append(coalesce(descendants, ARRAY[]::text[]), s)) AS x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_infer_apparel(
  p_garment_type text,
  p_category text,
  p_name text
)
RETURNS TABLE (slug text, confidence smallint, source text)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  gt text := public.catalog_taxonomy_norm(p_garment_type);
  cat text := public.catalog_taxonomy_norm(p_category);
  nam text := public.catalog_taxonomy_norm(p_name);
  is_dress boolean := gt = 'dresses' OR (cat ~ '(^|[^a-z])dress([^a-z]|$)' AND cat !~ 'shirtdress')
    OR (nam ~ '(^|[^a-z])dress([^a-z]|$)' AND nam !~ 'shirtdress' AND nam !~ 'jumpsuit' AND nam !~ 'romper');
  is_skirt boolean := gt = 'skirts' OR cat ~ 'skirt' OR nam ~ '(^|[^a-z])skirt([^a-z]|$)';
  is_jacket boolean := gt = 'jackets_blazers' OR cat ~ 'jacket' OR cat ~ 'blazer'
    OR nam ~ 'jacket' OR nam ~ 'blazer';
  is_coat boolean := gt = 'coats' OR (cat ~ 'coat' AND NOT is_jacket) OR nam ~ '(^|[^a-z])coat([^a-z]|$)';
  is_jean boolean := gt = 'pants_trousers'
    AND (nam ~ 'jean' OR cat ~ 'denim' OR nam ~ 'denim')
    AND NOT is_skirt AND NOT is_jacket;
  is_trouser boolean := gt = 'pants_trousers'
    AND (nam ~ 'trouser' OR cat ~ 'trouser' OR nam ~ '(^|[^a-z])pant([^a-z]|$)' OR cat ~ '(^|[^a-z])pant([^a-z]|$)')
    AND NOT is_jean;
  is_tshirt boolean := cat ~ 't-shirt|tee shirt|graphic tee' OR nam ~ 't-shirt| tee |graphic tee|crew neck tee|v-neck tee'
    OR (cat ~ 'tops' AND nam ~ ' tee');
  is_shirt boolean := (gt = 'shirts'
    OR ((cat ~ 'shirt' OR nam ~ '(^|[^a-z])shirt([^a-z]|$)') AND cat !~ 't-shirt' AND nam !~ 't-shirt' AND nam !~ 'shirtdress'))
    AND NOT is_tshirt;
  is_blouse boolean := gt = 'tops_blouses' AND (cat ~ 'blouse' OR nam ~ 'blouse');
  is_tank boolean := gt IN ('tops_blouses', 'shirts', 'tanks', 'camisoles')
    AND NOT is_dress AND NOT is_tshirt
    AND (cat ~ 'camisole' OR cat ~ 'tank' OR nam ~ 'tank' OR nam ~ 'camisole' OR nam ~ 'cami')
    AND nam !~ 'dress' AND cat !~ 'lingerie';
  is_bridal boolean := is_dress AND (nam ~ 'bridal' OR nam ~ 'wedding' OR nam ~ 'bride');
  is_knit boolean := gt IN ('knitwear', 'sweaters_cardigans');
  is_short boolean := gt = 'shorts';
  is_set boolean := gt = 'matching_sets' OR cat ~ 'co-ord' OR cat ~ 'coord' OR cat ~ 'two piece'
    OR nam ~ 'matching set' OR nam ~ 'co-ord';
  is_swim boolean := gt = 'swim_resortwear' OR cat ~ 'swim' OR cat ~ 'bikini' OR nam ~ 'swimwear';
  is_jumpsuit boolean := gt = 'jumpsuits' OR nam ~ 'jumpsuit' OR nam ~ 'romper' OR nam ~ 'playsuit';
  is_lingerie boolean := cat ~ 'lingerie' OR nam ~ 'lingerie' OR nam ~ '(^|[^a-z])bra([^a-z]|$)';
  is_generic_bottom boolean := (gt = 'other_apparel' OR gt IS NULL OR btrim(gt) = '')
    AND cat ~ 'bottom' AND NOT is_jean AND NOT is_trouser AND NOT is_short;
BEGIN
  IF is_jumpsuit THEN slug := 'clothing/jumpsuits'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_lingerie THEN slug := 'clothing/lingerie'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_generic_bottom THEN slug := 'clothing/bottoms'; confidence := 72; source := 'retailer_category'; RETURN NEXT; RETURN; END IF;
  IF is_bridal THEN slug := 'clothing/bridal-dresses'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_dress THEN slug := 'clothing/dresses'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jean THEN slug := 'clothing/jeans'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_trouser THEN slug := 'clothing/trousers'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_skirt THEN slug := 'clothing/skirts'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_short THEN slug := 'clothing/shorts'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jacket THEN slug := 'clothing/jackets'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_coat THEN slug := 'clothing/coats'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_knit THEN slug := 'clothing/knitwear'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_set THEN slug := 'clothing/matching-sets'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_swim THEN slug := 'clothing/swimwear'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_tshirt AND NOT is_tank THEN slug := 'clothing/t-shirts'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_shirt AND NOT is_blouse AND NOT is_tank THEN slug := 'clothing/shirts'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_blouse THEN slug := 'clothing/blouses'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_tank THEN slug := 'clothing/tanks-and-camisoles'; confidence := 84; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF gt = 'tops_blouses' THEN slug := 'clothing/tops'; confidence := 78; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF gt = 'shirts' THEN slug := 'clothing/shirts'; confidence := 72; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  RETURN;
END;
$$;

-- Reassign misrouted tops from inactive shirts leaf.
UPDATE public.product_taxonomy_assignments pta
SET taxonomy_slug = 'clothing/t-shirts', source = 'guarded_rule', confidence = 86, updated_at = now()
FROM public.live_products_apparel l
WHERE pta.offer_id = l.id
  AND pta.taxonomy_version = 'retail-v1'
  AND pta.is_primary IS TRUE
  AND pta.taxonomy_slug = 'clothing/shirts'
  AND (
    lower(coalesce(l.name, '')) ~ 't-shirt| tee |graphic tee|crew neck tee|v-neck tee'
    OR lower(coalesce(l.category, '')) ~ 't-shirt|tee'
  );

UPDATE public.product_taxonomy_assignments pta
SET taxonomy_slug = 'clothing/tops', source = 'garment_type', confidence = 78, updated_at = now()
FROM public.live_products_apparel l
WHERE pta.offer_id = l.id
  AND pta.taxonomy_version = 'retail-v1'
  AND pta.is_primary IS TRUE
  AND pta.taxonomy_slug = 'clothing/shirts'
  AND lower(coalesce(l.garment_type, '')) = 'tops_blouses'
  AND NOT (lower(coalesce(l.name, '')) ~ 'shirt|blouse|tank|camisole|tee|t-shirt')
  AND NOT (lower(coalesce(l.category, '')) ~ 'shirt|blouse|tank|camisole|tee|t-shirt');

-- Shirts/tanks stay inactive (precision QA failed).
UPDATE public.catalog_taxonomy_nodes
SET is_active = false, updated_at = now()
WHERE slug IN ('clothing/shirts', 'clothing/tanks-and-camisoles');

UPDATE public.catalog_taxonomy_nodes
SET is_active = true, updated_at = now()
WHERE slug = 'clothing/tops';

NOTIFY pgrst, 'reload schema';

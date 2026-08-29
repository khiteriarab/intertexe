-- Sleepwear: fix SQL garment classifier, stale classification rows, taxonomy gaps, and live MV drift.

-- Mirror lib/catalog-rules.ts — lingerie + sleepwear before shirt category.
CREATE OR REPLACE FUNCTION public.catalog_classify_garment(p_category text, p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := lower(trim(coalesce(p_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
BEGIN
  IF cat = '' AND nam = '' THEN RETURN 'needs_review'; END IF;
  IF cat ~ '(dress|gown)' OR nam ~ '(dress|gown)' THEN RETURN 'dresses'; END IF;
  IF cat ~ '(lingerie|underwear|intimate)'
    OR nam ~ '(lingerie|underwear|bralette|thong|brief|panty|knicker|corset)'
    OR nam ~ '(^|[^a-z])bra([^a-z]|$)' THEN
    RETURN 'lingerie';
  END IF;
  IF nam ~ 'bikini' AND (
    cat ~ '(lingerie|underwear|intimate)'
    OR (cat ~ 'swimwear' AND nam !~ 'swim' AND nam !~ 'beach' AND nam !~ 'resort' AND nam !~ 'pool')
  ) THEN
    RETURN 'lingerie';
  END IF;
  IF cat ~ '(sleepwear|nightwear|pyjama|pajama|loungewear)'
    OR nam ~ 'pajama|pyjama|nightgown|nightdress|sleepshirt|sleep shirt|sleep set|nightwear' THEN
    RETURN 'sleepwear';
  END IF;
  IF nam ~ 'robe' AND nam ~ 'dress' THEN NULL;
  ELSIF (cat ~ 'robe' OR nam ~ 'robe') AND (nam ~ 'bath' OR nam ~ 'dressing' OR cat ~ 'sleep' OR cat ~ 'lounge') THEN
    RETURN 'sleepwear';
  END IF;
  IF cat ~ '(blouse|bodysuit|tank|camisole)' OR nam ~ '(blouse|bodysuit)' THEN RETURN 'tops_blouses'; END IF;
  IF cat ~ '(^|[^a-z])top([^a-z]|$)' OR nam ~ '( tank top| camisole)' THEN RETURN 'tops_blouses'; END IF;
  IF cat ~ '(shirt)' AND cat !~ 't-shirt'
    AND nam !~ 'pajama|pyjama|nightgown|nightdress|sleepshirt|sleep shirt|sleep set|nightwear' THEN
    RETURN 'shirts';
  END IF;
  IF cat ~ '(knit)' AND cat !~ '(sweater|cardigan)' THEN RETURN 'knitwear'; END IF;
  IF cat ~ '(sweater|cardigan|pullover|jumper)' THEN RETURN 'sweaters_cardigans'; END IF;
  IF cat ~ '(pant|trouser|jean|denim)' THEN RETURN 'pants_trousers'; END IF;
  IF cat ~ '(skirt)' THEN RETURN 'skirts'; END IF;
  IF cat ~ '(short)' THEN RETURN 'shorts'; END IF;
  IF cat ~ '(blazer|jacket)' THEN RETURN 'jackets_blazers'; END IF;
  IF cat ~ '(coat|outerwear|parka|trench|anorak)' THEN RETURN 'coats'; END IF;
  IF cat ~ '(swim|bikini|resort)' OR nam ~ 'swimwear|swimsuit|one-piece swim' THEN RETURN 'swim_resortwear'; END IF;
  IF cat ~ '(scarf|wrap|shawl)' OR nam ~ '(scarf|wrap|shawl)' THEN RETURN 'scarves_wraps'; END IF;
  IF cat ~ '(set|co-ord|coord|two piece|two-piece)' THEN RETURN 'matching_sets'; END IF;
  IF cat = '' THEN RETURN 'needs_review'; END IF;
  RETURN 'other_apparel';
END;
$$;

-- Belt-and-suspenders: shirt inference must not beat sleepwear on "Pajama Shirt".
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
  is_lingerie boolean := gt = 'lingerie'
    OR cat ~ 'lingerie' OR cat ~ 'underwear' OR cat ~ 'intimate'
    OR nam ~ 'lingerie' OR nam ~ 'underwear'
    OR nam ~ '(^|[^a-z])bra([^a-z]|$)' OR nam ~ 'bralette'
    OR nam ~ 'thong' OR nam ~ 'brief' OR nam ~ 'panty' OR nam ~ 'knicker' OR nam ~ 'corset'
    OR (nam ~ 'bikini' AND (
      cat ~ 'lingerie' OR cat ~ 'underwear' OR cat ~ 'intimate'
      OR (cat ~ 'swimwear' AND nam !~ 'swim' AND nam !~ 'beach' AND nam !~ 'resort' AND nam !~ 'pool')
    ));
  is_sleepwear boolean := (
    gt IN ('sleepwear', 'loungewear')
    OR cat ~ 'sleepwear' OR cat ~ 'nightwear' OR cat ~ 'pyjama' OR cat ~ 'pajama' OR cat ~ 'loungewear'
    OR nam ~ 'pajama' OR nam ~ 'pyjama' OR nam ~ 'nightgown' OR nam ~ 'nightdress'
    OR nam ~ 'sleepshirt' OR nam ~ 'sleep shirt' OR nam ~ 'sleep set' OR nam ~ 'nightwear'
    OR nam ~ 'nightshirt' OR nam ~ 'pyjama top' OR nam ~ 'pajama top'
    OR ((cat ~ 'robe' OR nam ~ 'robe') AND (nam ~ 'bath' OR nam ~ 'dressing' OR cat ~ 'sleep' OR cat ~ 'lounge'))
  )
  AND NOT is_dress
  AND NOT (nam ~ 'robe' AND nam ~ 'dress');
  is_shirt boolean := (gt = 'shirts'
    OR ((cat ~ 'shirt' OR nam ~ '(^|[^a-z])shirt([^a-z]|$)') AND cat !~ 't-shirt' AND nam !~ 't-shirt' AND nam !~ 'shirtdress'))
    AND NOT is_tshirt
    AND NOT is_sleepwear;
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
  is_jumpsuit boolean := gt = 'jumpsuits' OR nam ~ 'jumpsuit' OR nam ~ 'romper' OR nam ~ 'playsuit';
  is_swim boolean := NOT is_lingerie AND (
    gt = 'swim_resortwear'
    OR cat ~ 'swimwear' OR cat ~ 'swim wear' OR cat ~ 'beachwear' OR cat ~ 'beach wear'
    OR nam ~ 'swimwear' OR nam ~ 'swimsuit' OR nam ~ 'one-piece swim'
    OR (cat ~ 'swim' AND cat !~ 'lingerie')
    OR (nam ~ 'bikini' AND (cat ~ 'swim' OR cat ~ 'beach' OR nam ~ 'swim' OR nam ~ 'beach' OR nam ~ 'resort'))
  );
  is_generic_bottom boolean := (gt = 'other_apparel' OR gt IS NULL OR btrim(gt) = '')
    AND cat ~ 'bottom' AND NOT is_jean AND NOT is_trouser AND NOT is_short;
BEGIN
  IF is_jumpsuit THEN slug := 'clothing/jumpsuits'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_lingerie THEN slug := 'clothing/lingerie'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_sleepwear THEN slug := 'clothing/sleepwear'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
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

UPDATE public.catalog_taxonomy_nodes
SET label = 'Sleepwear', updated_at = now()
WHERE slug = 'clothing/sleepwear';

UPDATE public.products p
SET garment_type = 'sleepwear'
WHERE lower(coalesce(p.name, '')) ~ 'pajama|pyjama|nightgown|nightdress|sleep shirt|sleepshirt|sleep set|nightwear|nightshirt|pyjama top|pajama top'
  AND coalesce(p.garment_type, '') NOT IN ('sleepwear', 'lingerie')
  AND NOT (
    lower(coalesce(p.name, '')) ~ 'robe' AND lower(coalesce(p.name, '')) ~ 'dress'
  );

UPDATE public.product_offer_classification c
SET
  garment_type = 'sleepwear',
  classified_at = now()
FROM public.products p
WHERE c.offer_id = p.id
  AND lower(coalesce(p.name, '')) ~ 'pajama|pyjama|nightgown|nightdress|sleep shirt|sleepshirt|sleep set|nightwear|nightshirt|pyjama top|pajama top'
  AND coalesce(c.garment_type, '') IN ('shirts', 'tops_blouses', 'knitwear', 'other_apparel', 'needs_review');

UPDATE public.product_taxonomy_assignments pta
SET
  taxonomy_slug = 'clothing/sleepwear',
  source = 'guarded_rule',
  confidence = 86,
  updated_at = now()
FROM public.products p
WHERE pta.offer_id = p.id
  AND pta.taxonomy_version = 'retail-v1'
  AND pta.is_primary IS TRUE
  AND pta.taxonomy_slug IN ('clothing/shirts', 'clothing/tops', 'clothing/blouses', 'clothing/t-shirts', 'clothing/tanks-and-camisoles')
  AND (
    p.garment_type = 'sleepwear'
    OR lower(coalesce(p.name, '')) ~ 'pajama|pyjama|nightgown|nightdress|sleep shirt|sleepshirt|sleep set|nightwear|nightshirt|pyjama top|pajama top'
  );

INSERT INTO public.product_taxonomy_assignments (
  offer_id, taxonomy_slug, is_primary, source, confidence, taxonomy_version
)
SELECT
  p.id,
  'clothing/sleepwear',
  true,
  'guarded_rule',
  86,
  'retail-v1'
FROM public.products p
WHERE p.is_displayable IS TRUE
  AND (
    p.garment_type = 'sleepwear'
    OR lower(coalesce(p.name, '')) ~ 'pajama|pyjama|nightgown|nightdress|sleep shirt|sleepshirt|sleep set|nightwear|nightshirt|pyjama top|pajama top'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.product_taxonomy_assignments pta
    WHERE pta.offer_id = p.id
      AND pta.taxonomy_version = 'retail-v1'
      AND pta.is_primary IS TRUE
  )
ON CONFLICT (offer_id, taxonomy_slug) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = now();

NOTIFY pgrst, 'reload schema';

-- Part 2: backfill stale classification + taxonomy rows for sleepwear keywords.

UPDATE public.product_offer_classification c
SET garment_type = 'sleepwear', classified_at = now()
FROM public.products p
WHERE c.offer_id = p.id
  AND lower(coalesce(p.name, '')) ~ 'pajama|pyjama|nightgown|nightdress|sleep shirt|sleepshirt|sleep set|nightwear|nightshirt|pyjama top|pajama top'
  AND coalesce(c.garment_type, '') IN ('shirts', 'tops_blouses', 'knitwear', 'other_apparel', 'needs_review');

UPDATE public.product_taxonomy_assignments pta
SET taxonomy_slug = 'clothing/sleepwear', source = 'guarded_rule', confidence = 86, updated_at = now()
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
SELECT p.id, 'clothing/sleepwear', true, 'guarded_rule', 86, 'retail-v1'
FROM public.products p
WHERE p.is_displayable IS TRUE
  AND (
    p.garment_type = 'sleepwear'
    OR lower(coalesce(p.name, '')) ~ 'pajama|pyjama|nightgown|nightdress|sleep shirt|sleepshirt|sleep set|nightwear|nightshirt|pyjama top|pajama top'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.product_taxonomy_assignments pta
    WHERE pta.offer_id = p.id AND pta.taxonomy_version = 'retail-v1' AND pta.is_primary IS TRUE
  )
ON CONFLICT (offer_id, taxonomy_slug) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  updated_at = now();

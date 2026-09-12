-- Customer Zero case study: full governed lifecycle for ITX-LIVE-01 (linen shirt).
-- Powers live QR demo — scan intertexe.com/p/{public_id} to show real product journey.

INSERT INTO public.supply_chain_nodes (
  organization_id,
  product_id,
  tier,
  tier_label,
  facility_name,
  country_code,
  data_status
)
SELECT
  o.id,
  p.id,
  v.tier,
  v.tier_label,
  v.facility_name,
  v.country_code,
  v.data_status
FROM public.organizations o
JOIN public.products p ON p.organization_id = o.id AND p.style_code = 'ITX-LIVE-01'
CROSS JOIN (
  VALUES
    (4, 'Raw material', 'Flax cultivation', 'FR', 'provided'),
    (3, 'Processing', 'Linen scutching & hackling', 'FR', 'provided'),
    (2, 'Fabric', 'Woven linen mill', 'IT', 'provided'),
    (1, 'Manufacturing', 'Shirt assembly · Atelier Norte', 'PT', 'provided')
) AS v(tier, tier_label, facility_name, country_code, data_status)
WHERE o.slug = 'intertexe'
ON CONFLICT (product_id, tier) DO UPDATE SET
  tier_label = EXCLUDED.tier_label,
  facility_name = EXCLUDED.facility_name,
  country_code = EXCLUDED.country_code,
  data_status = EXCLUDED.data_status,
  updated_at = now();

-- Public fields for consumer journey (distribution, sale, care, manufacturer)
DELETE FROM public.normalized_fields nf
USING public.organizations o, public.products p
WHERE nf.organization_id = o.id
  AND nf.product_id = p.id
  AND o.slug = 'intertexe'
  AND p.style_code = 'ITX-LIVE-01'
  AND nf.field_key IN ('manufacturer', 'care_instructions', 'distribution', 'retail_market');

INSERT INTO public.normalized_fields (
  organization_id,
  product_id,
  field_key,
  original_value,
  normalized_value,
  transformation_method,
  confidence,
  state,
  access_class,
  explanation,
  locked,
  version,
  intelligence_kind,
  ontology_version
)
SELECT
  o.id,
  p.id,
  f.field_key,
  f.value,
  f.value,
  'case_study_seed',
  0.95,
  'approved',
  'public',
  'Customer Zero case study — governed lifecycle demo for sales',
  false,
  1,
  'observed',
  'itx.ontology.v1'
FROM public.organizations o
JOIN public.products p ON p.organization_id = o.id AND p.style_code = 'ITX-LIVE-01'
CROSS JOIN (
  VALUES
    ('manufacturer', 'Atelier Norte'),
    ('care_instructions', 'Cold wash · Line dry · Iron low heat · Professional repair available'),
    ('distribution', 'European distribution'),
    ('retail_market', 'Barcelona')
) AS f(field_key, value)
WHERE o.slug = 'intertexe';

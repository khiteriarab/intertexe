-- Customer Zero sustainability demo data for ITX-LIVE-01 (linen shirt).

INSERT INTO public.product_impact_inputs (
  organization_id, product_id, metric_key, metric_label, value, unit, data_status, methodology, notes
)
SELECT o.id, p.id, m.metric_key, m.metric_label, m.value, m.unit, m.data_status, m.methodology, m.notes
FROM public.organizations o
JOIN public.products p ON p.organization_id = o.id AND p.style_code = 'ITX-LIVE-01'
CROSS JOIN (
  VALUES
    ('carbon_footprint_kg_co2e', 'Carbon footprint', 18.4, 'kg CO₂e', 'declared', 'ecobalyse', 'Ecobalyse v7.0 lifecycle estimate'),
    ('water_impact_liters', 'Water impact', 2840, 'L', 'declared', 'ecobalyse', 'Declared water use across lifecycle'),
    ('biodiversity_impact', 'Biodiversity impact', 0.42, 'index', 'estimated', 'ecobalyse', 'Relative biodiversity pressure index'),
    ('resource_use', 'Resource use', 1.2, 'index', 'declared', 'ecobalyse', 'Material efficiency index')
) AS m(metric_key, metric_label, value, unit, data_status, methodology, notes)
WHERE o.slug = 'intertexe'
ON CONFLICT (product_id, metric_key) DO UPDATE SET
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  data_status = EXCLUDED.data_status,
  methodology = EXCLUDED.methodology,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.product_regulatory_scores (
  organization_id, product_id, jurisdiction, regime, total_points, points_per_100g,
  methodology, methodology_version, calculated_at, declared_at, source, verification_status
)
SELECT o.id, p.id, 'FR', 'ecobalyse', 742, 215, 'ecobalyse', '7.0',
  now() - interval '14 days', now() - interval '30 days',
  'Brand-declared · Ecobalyse calculation', 'declared'
FROM public.organizations o
JOIN public.products p ON p.organization_id = o.id AND p.style_code = 'ITX-LIVE-01'
WHERE o.slug = 'intertexe'
ON CONFLICT (product_id, jurisdiction, regime) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  points_per_100g = EXCLUDED.points_per_100g,
  methodology_version = EXCLUDED.methodology_version,
  updated_at = now();

INSERT INTO public.normalized_fields (
  organization_id, product_id, field_key, original_value, normalized_value,
  transformation_method, confidence, state, access_class, explanation, locked, version, intelligence_kind, ontology_version
)
SELECT o.id, p.id, 'certifications', 'GOTS · OEKO-TEX Standard 100', 'GOTS · OEKO-TEX Standard 100',
  'case_study_seed', 0.9, 'approved', 'public', 'Demo certification row for sustainability profile', false, 1, 'observed', 'itx.ontology.v1'
FROM public.organizations o
JOIN public.products p ON p.organization_id = o.id AND p.style_code = 'ITX-LIVE-01'
WHERE o.slug = 'intertexe'
ON CONFLICT DO NOTHING;

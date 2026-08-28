-- Intelligence foundations: governed ontology, reusable normalization rules,
-- edge-case cases (tenant-isolated), mapping-template fingerprints, benchmark
-- metadata, and an empty privacy-safe consumer aggregate table.
-- Do not seed fake consumer metrics or live cross-tenant benchmarks.

-- ---------------------------------------------------------------------------
-- Material ontology (INTERTEXE-owned; authenticated read; service-role write)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.material_ontology_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewed', 'approved', 'retired')),
  effective_from date,
  effective_to date,
  provenance text,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ontology_version_id uuid NOT NULL REFERENCES public.material_ontology_versions (id) ON DELETE CASCADE,
  code text NOT NULL,
  canonical_name text NOT NULL,
  family text NOT NULL,
  parent_code text,
  kind text NOT NULL DEFAULT 'fiber'
    CHECK (kind IN ('fiber', 'material', 'construction', 'family')),
  origin_class text NOT NULL DEFAULT 'other'
    CHECK (origin_class IN ('natural', 'regenerated', 'synthetic', 'other')),
  provenance text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ontology_version_id, code)
);

CREATE TABLE IF NOT EXISTS public.material_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ontology_version_id uuid NOT NULL REFERENCES public.material_ontology_versions (id) ON DELETE CASCADE,
  term_code text NOT NULL,
  alias text NOT NULL,
  locale text NOT NULL DEFAULT 'und',
  provenance text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS material_aliases_version_alias_uidx
  ON public.material_aliases (ontology_version_id, lower(alias));

ALTER TABLE public.material_ontology_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ontology_versions_read ON public.material_ontology_versions;
CREATE POLICY ontology_versions_read ON public.material_ontology_versions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS material_terms_read ON public.material_terms;
CREATE POLICY material_terms_read ON public.material_terms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS material_aliases_read ON public.material_aliases;
CREATE POLICY material_aliases_read ON public.material_aliases
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.material_ontology_versions (
  version_label, status, effective_from, provenance, notes
) VALUES (
  'itx-ontology.v1',
  'approved',
  DATE '2026-08-27',
  'INTERTEXE governed textile fibre ontology. ISO 2076 codes and common trade aliases where listed. Not a governmental certification.',
  'v1 is frozen for published passports. Mint itx-ontology.v2 for breaking changes.'
) ON CONFLICT (version_label) DO NOTHING;

INSERT INTO public.material_terms (
  ontology_version_id, code, canonical_name, family, parent_code, kind, origin_class, provenance
)
SELECT v.id, x.code, x.canonical_name, x.family, x.parent_code, x.kind, x.origin_class, x.provenance
FROM public.material_ontology_versions v
CROSS JOIN (
  VALUES
    ('cotton', 'Cotton', 'cotton', NULL, 'fiber', 'natural', 'ISO 2076 CO'),
    ('linen', 'Linen', 'linen', NULL, 'fiber', 'natural', 'ISO 2076 LI'),
    ('silk', 'Silk', 'silk', NULL, 'fiber', 'natural', 'ISO 2076 SE'),
    ('wool', 'Wool', 'wool', NULL, 'fiber', 'natural', 'ISO 2076 WO'),
    ('cashmere', 'Cashmere', 'wool', 'wool', 'fiber', 'natural', 'ISO 2076 WS'),
    ('mohair', 'Mohair', 'wool', 'wool', 'fiber', 'natural', 'ISO 2076 WM'),
    ('hemp', 'Hemp', 'hemp', NULL, 'fiber', 'natural', 'ISO 2076 HE/HA'),
    ('alpaca', 'Alpaca', 'wool', 'wool', 'fiber', 'natural', 'common textile name'),
    ('leather', 'Leather', 'leather', NULL, 'material', 'natural', 'material not fibre'),
    ('suede', 'Suede', 'leather', 'leather', 'material', 'natural', 'leather construction/finish'),
    ('polyamide', 'Polyamide', 'polyamide', NULL, 'fiber', 'synthetic', 'ISO 2076 PA'),
    ('nylon', 'Nylon', 'polyamide', 'polyamide', 'fiber', 'synthetic', 'trade name in polyamide family'),
    ('polyester', 'Polyester', 'polyester', NULL, 'fiber', 'synthetic', 'ISO 2076 PES'),
    ('elastane', 'Elastane', 'elastane', NULL, 'fiber', 'synthetic', 'ISO 2076 EL; EA in some EU labels'),
    ('acrylic', 'Acrylic', 'acrylic', NULL, 'fiber', 'synthetic', 'ISO 2076 PC'),
    ('viscose', 'Viscose', 'viscose', NULL, 'fiber', 'regenerated', 'ISO 2076 CV'),
    ('rayon', 'Rayon', 'viscose', 'viscose', 'fiber', 'regenerated', 'common equivalent terminology'),
    ('lyocell', 'Lyocell', 'lyocell', NULL, 'fiber', 'regenerated', 'ISO 2076 CLY'),
    ('modal', 'Modal', 'modal', NULL, 'fiber', 'regenerated', 'ISO 2076 CMD'),
    ('cupro', 'Cupro', 'cupro', NULL, 'fiber', 'regenerated', 'ISO 2076 CU')
) AS x(code, canonical_name, family, parent_code, kind, origin_class, provenance)
WHERE v.version_label = 'itx-ontology.v1'
ON CONFLICT (ontology_version_id, code) DO NOTHING;

INSERT INTO public.material_aliases (ontology_version_id, term_code, alias, locale, provenance)
SELECT v.id, x.term_code, x.alias, x.locale, x.provenance
FROM public.material_ontology_versions v
CROSS JOIN (
  VALUES
    ('cotton', 'cotton', 'en', 'canonical'),
    ('cotton', 'co', 'und', 'ISO 2076'),
    ('linen', 'linen', 'en', 'canonical'),
    ('linen', 'li', 'und', 'ISO 2076'),
    ('linen', 'flax', 'en', 'equivalent terminology'),
    ('silk', 'silk', 'en', 'canonical'),
    ('silk', 'se', 'und', 'ISO 2076'),
    ('wool', 'wool', 'en', 'canonical'),
    ('wool', 'wo', 'und', 'ISO 2076'),
    ('wool', 'merino', 'en', 'v1 equivalent; split in a later version if needed'),
    ('cashmere', 'cashmere', 'en', 'canonical'),
    ('cashmere', 'ws', 'und', 'ISO 2076'),
    ('mohair', 'mohair', 'en', 'canonical'),
    ('mohair', 'wm', 'und', 'ISO 2076'),
    ('hemp', 'hemp', 'en', 'canonical'),
    ('hemp', 'he', 'und', 'ISO 2076'),
    ('hemp', 'ha', 'und', 'ISO 2076'),
    ('alpaca', 'alpaca', 'en', 'canonical'),
    ('leather', 'leather', 'en', 'canonical'),
    ('suede', 'suede', 'en', 'canonical'),
    ('polyamide', 'polyamide', 'en', 'canonical'),
    ('polyamide', 'pa', 'und', 'ISO 2076'),
    ('nylon', 'nylon', 'en', 'canonical'),
    ('polyester', 'polyester', 'en', 'canonical'),
    ('polyester', 'pes', 'und', 'ISO 2076'),
    ('polyester', 'pet', 'und', 'common abbreviation'),
    ('elastane', 'elastane', 'en', 'canonical'),
    ('elastane', 'ea', 'und', 'EU fibre labelling'),
    ('elastane', 'el', 'und', 'ISO 2076'),
    ('elastane', 'spandex', 'en', 'equivalent terminology'),
    ('elastane', 'lycra', 'en', 'trade name'),
    ('acrylic', 'acrylic', 'en', 'canonical'),
    ('acrylic', 'pc', 'und', 'ISO 2076'),
    ('viscose', 'viscose', 'en', 'canonical'),
    ('viscose', 'cv', 'und', 'ISO 2076'),
    ('rayon', 'rayon', 'en', 'canonical'),
    ('lyocell', 'lyocell', 'en', 'canonical'),
    ('lyocell', 'cly', 'und', 'ISO 2076'),
    ('lyocell', 'tencel', 'en', 'trade name'),
    ('modal', 'modal', 'en', 'canonical'),
    ('modal', 'cmd', 'und', 'ISO 2076'),
    ('cupro', 'cupro', 'en', 'canonical'),
    ('cupro', 'cu', 'und', 'ISO 2076')
) AS x(term_code, alias, locale, provenance)
WHERE v.version_label = 'itx-ontology.v1'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Normalization rules + justifying cases
-- Global approved rows: service-role only.
-- Org members may insert observed/candidate/reviewed/rejected for their org.
-- They cannot insert scope=global or status=approved.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.normalization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'organization'
    CHECK (scope IN ('global', 'organization')),
  status text NOT NULL DEFAULT 'observed'
    CHECK (status IN ('observed', 'candidate', 'reviewed', 'approved', 'rejected', 'superseded')),
  field_key text NOT NULL,
  raw_pattern text NOT NULL,
  canonical_value text NOT NULL,
  ontology_version text,
  method text NOT NULL DEFAULT 'deterministic',
  version integer NOT NULL DEFAULT 1,
  reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at timestamptz,
  provenance text,
  data_classification text NOT NULL DEFAULT 'customer_confidential',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT normalization_rules_scope_org_chk CHECK (
    (scope = 'global' AND organization_id IS NULL)
    OR (scope = 'organization' AND organization_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS normalization_rules_global_uidx
  ON public.normalization_rules (field_key, lower(raw_pattern), version)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS normalization_rules_org_uidx
  ON public.normalization_rules (organization_id, field_key, lower(raw_pattern), version)
  WHERE organization_id IS NOT NULL;

DROP TRIGGER IF EXISTS normalization_rules_updated_at ON public.normalization_rules;
CREATE TRIGGER normalization_rules_updated_at
  BEFORE UPDATE ON public.normalization_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.normalization_rule_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.normalization_rules (id) ON DELETE CASCADE,
  issue_id uuid REFERENCES public.issues (id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  original_value text,
  interpreted_value text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.normalization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalization_rule_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS normalization_rules_select ON public.normalization_rules;
CREATE POLICY normalization_rules_select ON public.normalization_rules
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NULL AND scope = 'global' AND status = 'approved')
    OR (organization_id IS NOT NULL AND public.can_view_org_records(organization_id))
  );

DROP POLICY IF EXISTS normalization_rules_insert ON public.normalization_rules;
CREATE POLICY normalization_rules_insert ON public.normalization_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND scope = 'organization'
    AND status IN ('observed', 'candidate', 'reviewed', 'rejected')
    AND public.can_mutate_org(organization_id)
  );

DROP POLICY IF EXISTS normalization_rules_update ON public.normalization_rules;
CREATE POLICY normalization_rules_update ON public.normalization_rules
  FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL AND public.can_mutate_org(organization_id)
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND scope = 'organization'
    AND status IN ('observed', 'candidate', 'reviewed', 'rejected')
    AND public.can_mutate_org(organization_id)
  );

DROP POLICY IF EXISTS normalization_rule_cases_select ON public.normalization_rule_cases;
CREATE POLICY normalization_rule_cases_select ON public.normalization_rule_cases
  FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));

DROP POLICY IF EXISTS normalization_rule_cases_mutate ON public.normalization_rule_cases;
CREATE POLICY normalization_rule_cases_mutate ON public.normalization_rule_cases
  FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

-- ---------------------------------------------------------------------------
-- Normalization provenance on existing fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.normalized_fields
  ADD COLUMN IF NOT EXISTS ontology_version text;

ALTER TABLE public.normalized_fields
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.normalization_rules (id) ON DELETE SET NULL;

ALTER TABLE public.normalized_fields
  ADD COLUMN IF NOT EXISTS intelligence_kind text NOT NULL DEFAULT 'observed';

ALTER TABLE public.normalized_fields
  DROP CONSTRAINT IF EXISTS normalized_fields_intelligence_kind_chk;
ALTER TABLE public.normalized_fields
  ADD CONSTRAINT normalized_fields_intelligence_kind_chk
  CHECK (intelligence_kind IN ('observed', 'normalized', 'derived', 'override'));

ALTER TABLE public.passport_versions
  ADD COLUMN IF NOT EXISTS ontology_version text;

-- ---------------------------------------------------------------------------
-- Saved source mappings (strengthen 011 stub)
-- ---------------------------------------------------------------------------

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS schema_fingerprint text;

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS source_schema_version text;

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS columns jsonb;

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS mapping_confidence text;

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

ALTER TABLE public.import_mapping_templates
  ADD COLUMN IF NOT EXISTS source_priority integer NOT NULL DEFAULT 0;

UPDATE public.import_mapping_templates
SET source_system = 'upload'
WHERE source_system IS NULL OR btrim(source_system) = '';

ALTER TABLE public.import_mapping_templates
  ALTER COLUMN source_system SET DEFAULT 'upload';

CREATE UNIQUE INDEX IF NOT EXISTS import_mapping_templates_org_source_schema_uidx
  ON public.import_mapping_templates (organization_id, source_system, schema_fingerprint)
  WHERE schema_fingerprint IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Benchmark metadata (still no live cross-tenant queries)
-- ---------------------------------------------------------------------------

ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS methodology_version text;

ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS calculated_at timestamptz;

ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS data_classification text NOT NULL DEFAULT 'internal';

ALTER TABLE public.benchmark_metrics
  ADD COLUMN IF NOT EXISTS metric_definition text;

ALTER TABLE public.benchmark_metrics
  ADD COLUMN IF NOT EXISTS time_period text;

-- ---------------------------------------------------------------------------
-- Consumer-demand intelligence (empty; no identifiable consumer keys)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consumer_intelligence_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  cohort text,
  category text,
  geography text,
  period_start date,
  period_end date,
  sample_size integer,
  min_cohort_size integer NOT NULL DEFAULT 50,
  methodology text,
  methodology_version text,
  source_channel text,
  metric_version text,
  privacy_classification text NOT NULL DEFAULT 'aggregate_internal'
    CHECK (privacy_classification IN (
      'aggregate_internal', 'aggregate_enterprise', 'forbidden_identifiable'
    )),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'retired')),
  provenance text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consumer_intelligence_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consumer_intelligence_select ON public.consumer_intelligence_aggregates;
CREATE POLICY consumer_intelligence_select ON public.consumer_intelligence_aggregates
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND privacy_classification IN ('aggregate_internal', 'aggregate_enterprise')
  );

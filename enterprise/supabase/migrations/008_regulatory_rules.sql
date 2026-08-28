-- Version-controlled regulatory rules. AI interpretations cannot activate themselves.

CREATE TABLE IF NOT EXISTS public.regulatory_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL,
  name text NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regulatory_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.regulatory_frameworks (id) ON DELETE CASCADE,
  version_label text NOT NULL,
  publication_date date,
  effective_date date,
  retrieved_at timestamptz,
  source_document text,
  interpretation_status text NOT NULL DEFAULT 'draft'
    CHECK (interpretation_status IN ('draft', 'reviewed', 'active', 'superseded')),
  entered_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, version_label)
);

CREATE TABLE IF NOT EXISTS public.regulatory_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version_id uuid NOT NULL REFERENCES public.regulatory_rule_versions (id) ON DELETE CASCADE,
  field_key text NOT NULL,
  product_scope jsonb,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regulatory_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  passport_id uuid REFERENCES public.passports (id) ON DELETE SET NULL,
  rule_version_id uuid NOT NULL REFERENCES public.regulatory_rule_versions (id),
  result text NOT NULL CHECK (result IN ('no_action', 'update_required', 'manual_review', 'blocked')),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_evaluations ENABLE ROW LEVEL SECURITY;

-- Catalog is readable to authenticated org members; writes are service-role / super-admin path only.
CREATE POLICY frameworks_read ON public.regulatory_frameworks FOR SELECT TO authenticated USING (true);
CREATE POLICY rule_versions_read ON public.regulatory_rule_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY requirements_read ON public.regulatory_requirements FOR SELECT TO authenticated USING (true);

CREATE POLICY evaluations_select ON public.regulatory_evaluations FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY evaluations_mutate ON public.regulatory_evaluations FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

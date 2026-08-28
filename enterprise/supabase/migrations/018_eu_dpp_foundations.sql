-- EU DPP first-pilot foundations: registry layer, identifiers, access classes,
-- evidence, economic operators, regulatory seed, backup packages, integrity.

-- Extended access classifications (ESPR actor-oriented; textile delegated act may refine).
ALTER TYPE public.enterprise_access_class ADD VALUE IF NOT EXISTS 'economic_operator';
ALTER TYPE public.enterprise_access_class ADD VALUE IF NOT EXISTS 'supply_chain';
ALTER TYPE public.enterprise_access_class ADD VALUE IF NOT EXISTS 'repair_recycling';
ALTER TYPE public.enterprise_access_class ADD VALUE IF NOT EXISTS 'authority';

CREATE TABLE IF NOT EXISTS public.economic_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  operator_role text NOT NULL CHECK (
    operator_role IN (
      'manufacturer', 'importer', 'authorised_representative', 'distributor', 'other'
    )
  ),
  registered_address text,
  country text,
  company_identifier text,
  vat_number text,
  eori_number text,
  unique_operator_identifier text,
  contact_email text,
  contact_phone text,
  registry_enrollment jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER economic_operators_updated_at
  BEFORE UPDATE ON public.economic_operators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_economic_operators (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  economic_operator_id uuid NOT NULL REFERENCES public.economic_operators (id) ON DELETE CASCADE,
  assignment_role text NOT NULL DEFAULT 'responsible_operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, economic_operator_id)
);

CREATE TABLE IF NOT EXISTS public.dpp_registry_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  passport_id uuid NOT NULL REFERENCES public.passports (id) ON DELETE CASCADE,
  passport_version_id uuid NOT NULL REFERENCES public.passport_versions (id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'production')),
  api_version text,
  status text NOT NULL DEFAULT 'not_registered' CHECK (
    status IN (
      'not_registered', 'registration_ready', 'submitted', 'registered',
      'failed', 'update_required'
    )
  ),
  product_unique_identifier text,
  economic_operator_identifier text,
  commodity_code text,
  submission_payload jsonb,
  submission_payload_hash text,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  registry_response jsonb,
  eu_registration_identifier text,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  error_state jsonb,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (passport_version_id, environment)
);

CREATE TRIGGER dpp_registry_registrations_updated_at
  BEFORE UPDATE ON public.dpp_registry_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  field_key text,
  evidence_type text NOT NULL,
  issuing_organization text,
  source_supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
  document_reference text,
  issue_id uuid REFERENCES public.issues (id) ON DELETE SET NULL,
  issued_at date,
  expires_at date,
  verification_status text NOT NULL DEFAULT 'missing' CHECK (
    verification_status IN (
      'missing', 'requested', 'received', 'under_review',
      'verified', 'rejected', 'expired'
    )
  ),
  reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  verified_at timestamptz,
  access_class public.enterprise_access_class NOT NULL DEFAULT 'internal',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER evidence_records_updated_at
  BEFORE UPDATE ON public.evidence_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.passport_backup_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  passport_id uuid NOT NULL REFERENCES public.passports (id) ON DELETE CASCADE,
  passport_version_id uuid NOT NULL REFERENCES public.passport_versions (id) ON DELETE CASCADE,
  package_hash text NOT NULL,
  package_snapshot jsonb NOT NULL,
  evidence_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  backup_provider_ref text,
  backup_status text NOT NULL DEFAULT 'local' CHECK (
    backup_status IN ('local', 'pending_replication', 'replicated', 'failed')
  ),
  restore_tested_at timestamptz,
  restore_test_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.passport_versions
  ADD COLUMN IF NOT EXISTS integrity_hash text,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.passport_versions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retention_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS identifier_bundle jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.supplier_requests
  ADD COLUMN IF NOT EXISTS issue_id uuid REFERENCES public.issues (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_kind text NOT NULL DEFAULT 'evidence',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS requested_evidence jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.regulatory_requirements
  ADD COLUMN IF NOT EXISTS requirement_key text,
  ADD COLUMN IF NOT EXISTS authoritative_source text,
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS access_class public.enterprise_access_class,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS applicability jsonb,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_until date,
  ADD COLUMN IF NOT EXISTS obligation_kind text CHECK (
    obligation_kind IS NULL OR obligation_kind IN (
      'espr_base', 'textile_delegated_act', 'intertexe_best_practice', 'awaiting_rule'
    )
  );

-- ESPR foundation ruleset (not textile-specific compliance).
INSERT INTO public.regulatory_frameworks (id, jurisdiction, name, source_url)
SELECT
  'a1000001-0001-4001-8001-000000000001',
  'EU',
  'Ecodesign for Sustainable Products Regulation (ESPR)',
  'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781'
WHERE NOT EXISTS (
  SELECT 1 FROM public.regulatory_frameworks WHERE id = 'a1000001-0001-4001-8001-000000000001'
);

INSERT INTO public.regulatory_rule_versions (
  id, framework_id, version_label, effective_date, interpretation_status, notes
)
VALUES (
  'a1000002-0002-4002-8002-000000000002',
  'a1000001-0001-4001-8001-000000000001',
  'espr-foundation.v1',
  '2024-07-18',
  'active',
  'INTERTEXE ESPR foundation readiness only. Textile delegated act requirements are not included.'
)
ON CONFLICT (framework_id, version_label) DO NOTHING;

INSERT INTO public.regulatory_requirements (
  rule_version_id, requirement_key, field_key, required, authoritative_source,
  source_reference, source_url, access_class, severity, obligation_kind, applicability
)
SELECT
  'a1000002-0002-4002-8002-000000000002',
  v.requirement_key,
  v.field_key,
  true,
  'ESPR (EU) 2024/1781',
  'Article 10 — unique product identifier and data carrier (framework)',
  'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781',
  v.access_class::public.enterprise_access_class,
  v.severity,
  'espr_base',
  v.applicability::jsonb
FROM (VALUES
  ('product.identity.name', 'name', 'public', 'high', '{"all_products": true}'),
  ('product.identity.sku_or_style', 'sku', 'public', 'medium', '{"all_products": true}'),
  ('product.material.composition', 'composition', 'public', 'high', '{"all_products": true}'),
  ('product.identity.resolver', 'public_resolver_id', 'public', 'high', '{"published_passport": true}')
) AS v(requirement_key, field_key, access_class, severity, applicability)
WHERE NOT EXISTS (
  SELECT 1 FROM public.regulatory_requirements r
  WHERE r.rule_version_id = 'a1000002-0002-4002-8002-000000000002'
    AND r.requirement_key = v.requirement_key
);

ALTER TABLE public.economic_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_economic_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_registry_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_backup_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY economic_operators_select ON public.economic_operators FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY economic_operators_mutate ON public.economic_operators FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY product_economic_operators_select ON public.product_economic_operators FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY product_economic_operators_mutate ON public.product_economic_operators FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY registry_registrations_select ON public.dpp_registry_registrations FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY registry_registrations_mutate ON public.dpp_registry_registrations FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY evidence_records_select ON public.evidence_records FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY evidence_records_mutate ON public.evidence_records FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY backup_packages_select ON public.passport_backup_packages FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY backup_packages_mutate ON public.passport_backup_packages FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

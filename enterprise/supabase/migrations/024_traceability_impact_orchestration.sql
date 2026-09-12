-- Fashion data orchestration depth layer: traceability tiers, impact inputs,
-- supplier collaboration status, social evidence metadata.

CREATE TABLE IF NOT EXISTS public.supply_chain_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  tier smallint NOT NULL CHECK (tier BETWEEN 1 AND 4),
  tier_label text NOT NULL,
  facility_name text,
  country_code text,
  supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
  source_record_id uuid REFERENCES public.source_records (id) ON DELETE SET NULL,
  evidence_id uuid REFERENCES public.evidence_records (id) ON DELETE SET NULL,
  relationship_role text,
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  data_status text NOT NULL DEFAULT 'provided' CHECK (
    data_status IN ('provided', 'unknown', 'missing', 'not_applicable')
  ),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier)
);

CREATE INDEX IF NOT EXISTS supply_chain_nodes_org_product_idx
  ON public.supply_chain_nodes (organization_id, product_id);

CREATE TRIGGER supply_chain_nodes_updated_at
  BEFORE UPDATE ON public.supply_chain_nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_impact_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_label text,
  value numeric,
  unit text,
  data_status text NOT NULL DEFAULT 'missing' CHECK (
    data_status IN ('verified', 'declared', 'estimated', 'missing', 'not_applicable')
  ),
  methodology text,
  evidence_id uuid REFERENCES public.evidence_records (id) ON DELETE SET NULL,
  source_record_id uuid REFERENCES public.source_records (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, metric_key)
);

CREATE INDEX IF NOT EXISTS product_impact_inputs_org_product_idx
  ON public.product_impact_inputs (organization_id, product_id);

CREATE TRIGGER product_impact_inputs_updated_at
  BEFORE UPDATE ON public.product_impact_inputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.supplier_social_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  audit_status text,
  certification text,
  labor_risk_flag text CHECK (
    labor_risk_flag IS NULL OR labor_risk_flag IN ('none_recorded', 'review_required', 'not_applicable')
  ),
  wage_evidence text,
  worker_safety_evidence text,
  social_compliance_evidence text,
  evidence_id uuid REFERENCES public.evidence_records (id) ON DELETE SET NULL,
  data_status text NOT NULL DEFAULT 'missing' CHECK (
    data_status IN ('verified', 'declared', 'missing', 'not_applicable')
  ),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_social_evidence_org_supplier_idx
  ON public.supplier_social_evidence (organization_id, supplier_id);

CREATE TRIGGER supplier_social_evidence_updated_at
  BEFORE UPDATE ON public.supplier_social_evidence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.supplier_requests
  ADD COLUMN IF NOT EXISTS collaboration_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewer_status text,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.integration_connections
  ADD COLUMN IF NOT EXISTS system_type text,
  ADD COLUMN IF NOT EXISTS field_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS normalization_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS records_failed integer NOT NULL DEFAULT 0;

ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS pipeline_stage text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

-- RLS mirrors catalog isolation (suppliers cannot browse org records).
ALTER TABLE public.supply_chain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_impact_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_social_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY supply_chain_nodes_select ON public.supply_chain_nodes FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY supply_chain_nodes_mutate ON public.supply_chain_nodes FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY product_impact_inputs_select ON public.product_impact_inputs FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY product_impact_inputs_mutate ON public.product_impact_inputs FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY supplier_social_evidence_select ON public.supplier_social_evidence FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY supplier_social_evidence_mutate ON public.supplier_social_evidence FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

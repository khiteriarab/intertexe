-- Environmental Impact & Sustainability Verification layer.
-- Stores regulatory scores separately from generic impact inputs — modular by jurisdiction.

CREATE TABLE IF NOT EXISTS public.product_regulatory_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  jurisdiction text NOT NULL,
  regime text NOT NULL,
  total_points numeric(12, 2),
  points_per_100g numeric(12, 4),
  methodology text,
  methodology_version text,
  calculated_at timestamptz,
  declared_at timestamptz,
  source text,
  verification_status text NOT NULL DEFAULT 'declared' CHECK (
    verification_status IN ('verified', 'declared', 'estimated', 'missing', 'not_applicable')
  ),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, jurisdiction, regime)
);

CREATE INDEX IF NOT EXISTS product_regulatory_scores_org_product_idx
  ON public.product_regulatory_scores (organization_id, product_id);

CREATE TRIGGER product_regulatory_scores_updated_at
  BEFORE UPDATE ON public.product_regulatory_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_regulatory_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_regulatory_scores_select ON public.product_regulatory_scores FOR SELECT TO authenticated
  USING (public.can_view_org_records(organization_id));
CREATE POLICY product_regulatory_scores_mutate ON public.product_regulatory_scores FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

COMMENT ON TABLE public.product_regulatory_scores IS 'Jurisdiction-specific regulatory environmental scores (e.g. France Ecobalyse). Never substitute official methodology with a custom INTERTEXE score.';

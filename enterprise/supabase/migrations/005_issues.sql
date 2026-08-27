-- Issues inbox and missing-data register.

CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.variants (id) ON DELETE SET NULL,
  issue_type text NOT NULL
    CHECK (issue_type IN (
      'missing_data', 'conflict', 'validation', 'evidence',
      'identifier', 'supplier', 'regulatory', 'review_required'
    )),
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  detail text,
  original_value text,
  interpreted_value text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'assigned', 'resolved', 'rejected', 'not_applicable')),
  assignee_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issues_org_status_idx ON public.issues (organization_id, status, created_at DESC);

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.missing_data_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  field_key text NOT NULL,
  why_it_matters text,
  suggested_source text,
  owner_role text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_data_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY issues_select ON public.issues FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY issues_mutate ON public.issues FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY missing_select ON public.missing_data_register FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY missing_mutate ON public.missing_data_register FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

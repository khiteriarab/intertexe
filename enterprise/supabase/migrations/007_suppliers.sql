-- Suppliers, assigned requests, submissions. Contributors see only assigned rows.

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  assignee_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.supplier_requests (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  submitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.can_access_supplier_request(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_requests r
    WHERE r.id = target
      AND (
        public.can_mutate_org(r.organization_id)
        OR (
          public.org_role(r.organization_id) = 'supplier_contributor'
          AND r.assignee_user_id = public.current_profile_id()
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_supplier_request(uuid) TO authenticated;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) AND public.org_role(organization_id) <> 'supplier_contributor');
CREATE POLICY suppliers_mutate ON public.suppliers FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY supplier_requests_select ON public.supplier_requests FOR SELECT TO authenticated
  USING (
    public.can_mutate_org(organization_id)
    OR (public.org_role(organization_id) = 'supplier_contributor' AND assignee_user_id = public.current_profile_id())
  );
CREATE POLICY supplier_requests_mutate ON public.supplier_requests FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY supplier_submissions_select ON public.supplier_submissions FOR SELECT TO authenticated
  USING (public.can_access_supplier_request(request_id));
CREATE POLICY supplier_submissions_insert ON public.supplier_submissions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_supplier_request(request_id));
CREATE POLICY supplier_submissions_review ON public.supplier_submissions FOR UPDATE TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

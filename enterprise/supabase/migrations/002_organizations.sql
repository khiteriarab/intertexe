-- Organizations, memberships, invitations, workspaces, catalogs, entitlements.

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind public.enterprise_org_kind NOT NULL DEFAULT 'customer',
  plan public.enterprise_plan_key NOT NULL DEFAULT 'free_snapshot',
  account_state public.enterprise_account_state NOT NULL DEFAULT 'active',
  is_demo boolean NOT NULL DEFAULT false,
  is_customer_zero boolean NOT NULL DEFAULT false,
  approved_for_public_demo boolean NOT NULL DEFAULT false,
  product_allowance integer,
  passport_allowance integer,
  hq_deal_id uuid,
  hq_contact_id uuid,
  billing jsonb NOT NULL DEFAULT '{}'::jsonb,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_stage text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_demo_public_chk CHECK (
    (NOT approved_for_public_demo) OR is_demo
  ),
  CONSTRAINT organizations_slug_format_chk CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$')
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.enterprise_membership_role NOT NULL,
  status public.enterprise_membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TRIGGER organization_memberships_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
  ON public.organization_memberships (user_id, status);

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.enterprise_membership_role NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  slug text NOT NULL DEFAULT 'default',
  name text NOT NULL DEFAULT 'Default workspace',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces (id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER catalogs_updated_at
  BEFORE UPDATE ON public.catalogs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  document_key text NOT NULL,
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_org_member(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.organization_id = target
      AND p.auth_user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.org_role(target uuid)
RETURNS public.enterprise_membership_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.organization_memberships m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.organization_id = target
    AND p.auth_user_id = auth.uid()
    AND m.status = 'active'
  ORDER BY
    CASE m.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'product_manager' THEN 3
      WHEN 'sustainability' THEN 4
      WHEN 'reviewer' THEN 5
      WHEN 'developer' THEN 6
      WHEN 'read_only' THEN 7
      WHEN 'supplier_contributor' THEN 8
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_mutate_org(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(target)
    AND public.org_role(target) NOT IN ('read_only', 'supplier_contributor');
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_mutate_org(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_mutate_org(uuid) TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_member_select
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY organizations_admin_update
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.org_role(id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(id) IN ('owner', 'admin'));

CREATE POLICY memberships_member_select
  ON public.organization_memberships FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY memberships_admin_write
  ON public.organization_memberships FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY invitations_admin_all
  ON public.invitations FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY workspaces_member_select
  ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY workspaces_admin_write
  ON public.workspaces FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY catalogs_member_select
  ON public.catalogs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY catalogs_mutate
  ON public.catalogs FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY legal_member_select
  ON public.legal_acceptances FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY legal_member_insert
  ON public.legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND user_id = public.current_profile_id());

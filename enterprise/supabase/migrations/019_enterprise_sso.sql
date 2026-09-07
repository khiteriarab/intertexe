-- Enterprise customer SSO (obelisk-core only).
-- Organization-scoped IdP configuration and stable provider identity links.
-- Email domains are for discovery only — never authorization.

DO $$ BEGIN
  CREATE TYPE public.enterprise_sso_provider AS ENUM ('saml', 'oidc', 'google_workspace');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_sso_status AS ENUM ('draft', 'active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.organization_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  provider public.enterprise_sso_provider NOT NULL,
  status public.enterprise_sso_status NOT NULL DEFAULT 'draft',
  -- Supabase Auth SSO domain (signInWithSSO) or OAuth provider slug — never store secrets here.
  sso_domain text,
  oauth_provider_slug text,
  issuer text,
  allowed_email_domains text[] NOT NULL DEFAULT '{}'::text[],
  enforce_sso boolean NOT NULL DEFAULT false,
  allow_password_fallback boolean NOT NULL DEFAULT true,
  provider_label text,
  configured_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_sso_configs_domains_nonempty_chk CHECK (
    cardinality(allowed_email_domains) >= 1 OR status = 'draft'
  ),
  CONSTRAINT organization_sso_configs_active_requires_domain_chk CHECK (
    status <> 'active' OR (sso_domain IS NOT NULL OR oauth_provider_slug IS NOT NULL)
  )
);

CREATE TRIGGER organization_sso_configs_updated_at
  BEFORE UPDATE ON public.organization_sso_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- One organization per email domain for active discovery routing.
CREATE TABLE IF NOT EXISTS public.organization_sso_domains (
  domain text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  sso_config_id uuid NOT NULL REFERENCES public.organization_sso_configs (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_sso_domains_org_idx
  ON public.organization_sso_domains (organization_id);

-- Stable provider identity — email is audit-only, never the canonical key.
CREATE TABLE IF NOT EXISTS public.enterprise_sso_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL,
  issuer text NOT NULL,
  provider_subject text NOT NULL,
  provider public.enterprise_sso_provider NOT NULL,
  email_at_link text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT enterprise_sso_identities_org_issuer_sub_uniq
    UNIQUE (organization_id, issuer, provider_subject),
  CONSTRAINT enterprise_sso_identities_org_user_issuer_uniq
    UNIQUE (organization_id, auth_user_id, issuer)
);

CREATE INDEX IF NOT EXISTS enterprise_sso_identities_auth_user_idx
  ON public.enterprise_sso_identities (auth_user_id);

CREATE INDEX IF NOT EXISTS enterprise_sso_identities_org_idx
  ON public.enterprise_sso_identities (organization_id);

CREATE TABLE IF NOT EXISTS public.enterprise_sso_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  auth_user_id uuid,
  provider public.enterprise_sso_provider,
  success boolean NOT NULL,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_sso_login_events_org_idx
  ON public.enterprise_sso_login_events (organization_id, created_at DESC);

COMMENT ON TABLE public.organization_sso_configs IS
  'Per-organization enterprise SSO settings. Secrets remain in Supabase Auth dashboard or server env — never exposed to browsers.';

COMMENT ON TABLE public.enterprise_sso_identities IS
  'Maps stable IdP subject (issuer + sub) to obelisk-core auth.users.id within an organization. Email is mutable audit data only.';

COMMENT ON TABLE public.organization_sso_domains IS
  'Email domain → organization routing for SSO discovery. Domain match does not grant access.';

ALTER TABLE public.organization_sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_sso_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_sso_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_sso_login_events ENABLE ROW LEVEL SECURITY;

-- Owners/admins may read non-secret SSO settings for their org.
CREATE POLICY organization_sso_configs_admin_select
  ON public.organization_sso_configs FOR SELECT TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY organization_sso_configs_admin_mutate
  ON public.organization_sso_configs FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY organization_sso_domains_admin_select
  ON public.organization_sso_domains FOR SELECT TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY organization_sso_domains_admin_mutate
  ON public.organization_sso_domains FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin'));

-- SSO identity rows are server-managed during callback; members cannot enumerate others' links.
CREATE POLICY enterprise_sso_identities_self_select
  ON public.enterprise_sso_identities FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    AND public.is_org_member(organization_id)
  );

-- Login events: org admins may read their org audit stream.
CREATE POLICY enterprise_sso_login_events_admin_select
  ON public.enterprise_sso_login_events FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.org_role(organization_id) IN ('owner', 'admin'));

-- Enterprise operational infrastructure: notifications, approvals, import ops,
-- integration health, saved views, security settings, SCIM placeholder.

DO $$ BEGIN
  CREATE TYPE public.enterprise_notification_category AS ENUM (
    'issue_assigned', 'import_failed', 'import_completed', 'approval_requested',
    'approval_decided', 'passport_ready', 'passport_published', 'integration_error',
    'supplier_evidence', 'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_approval_status AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_approval_subject AS ENUM (
    'product_fields', 'passport_publish', 'import_release', 'integration_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- In-app notification inbox (distinct from notification_preferences).
CREATE TABLE IF NOT EXISTS public.enterprise_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category public.enterprise_notification_category NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  href text,
  read_at timestamptz,
  email_sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_notifications_recipient_idx
  ON public.enterprise_notifications (recipient_id, read_at NULLS FIRST, created_at DESC);

CREATE INDEX IF NOT EXISTS enterprise_notifications_org_idx
  ON public.enterprise_notifications (organization_id, created_at DESC);

-- Explicit approval workflow.
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  subject_type public.enterprise_approval_subject NOT NULL,
  subject_id uuid NOT NULL,
  status public.enterprise_approval_status NOT NULL DEFAULT 'pending',
  requested_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text,
  request_comment text,
  decision_comment text,
  decided_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  decided_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_requests_org_status_idx
  ON public.approval_requests (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS approval_requests_subject_idx
  ON public.approval_requests (organization_id, subject_type, subject_id);

CREATE TRIGGER approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.approval_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  comment text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_request_events_request_idx
  ON public.approval_request_events (approval_request_id, created_at);

-- Per-row import errors for import ops center.
CREATE TABLE IF NOT EXISTS public.import_row_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.imports (id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  field_key text,
  error_code text NOT NULL,
  message text NOT NULL,
  raw_excerpt jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_row_errors_import_idx
  ON public.import_row_errors (import_id, row_number);

-- Integration connections + run history.
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  integration_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  records_processed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, integration_key)
);

CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.integration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.integration_connections (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  records_processed integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS integration_runs_connection_idx
  ON public.integration_runs (connection_id, started_at DESC);

-- Saved filtered views.
CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  module_key text NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_views_org_module_idx
  ON public.saved_views (organization_id, module_key, shared);

CREATE TRIGGER saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Org security settings (MFA policy placeholder).
CREATE TABLE IF NOT EXISTS public.organization_security_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  mfa_required boolean NOT NULL DEFAULT false,
  password_min_length integer NOT NULL DEFAULT 12,
  session_timeout_minutes integer NOT NULL DEFAULT 720,
  allowed_email_domains text[] NOT NULL DEFAULT '{}'::text[],
  scim_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER organization_security_settings_updated_at
  BEFORE UPDATE ON public.organization_security_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCIM connection placeholder (provisioning hooks for later).
CREATE TABLE IF NOT EXISTS public.scim_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  bearer_token_hash text,
  last_sync_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER scim_connections_updated_at
  BEFORE UPDATE ON public.scim_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend imports with operational summary.
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- Extend webhooks with health fields.
ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS events text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- Extend api_credentials with lifecycle fields.
ALTER TABLE public.api_credentials
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- RLS
ALTER TABLE public.enterprise_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_row_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY enterprise_notifications_self ON public.enterprise_notifications
  FOR ALL TO authenticated
  USING (recipient_id = public.current_profile_id() AND public.is_org_member(organization_id))
  WITH CHECK (recipient_id = public.current_profile_id() AND public.is_org_member(organization_id));

CREATE POLICY approval_requests_member_select ON public.approval_requests
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY approval_requests_mutate ON public.approval_requests
  FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY approval_request_events_select ON public.approval_request_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY approval_request_events_insert ON public.approval_request_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY import_row_errors_select ON public.import_row_errors
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY integration_connections_admin ON public.integration_connections
  FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin', 'developer'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin', 'developer'));

CREATE POLICY integration_runs_select ON public.integration_runs
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY saved_views_access ON public.saved_views
  FOR ALL TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (owner_id = public.current_profile_id() OR shared = true)
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND owner_id = public.current_profile_id()
  );

CREATE POLICY org_security_settings_admin ON public.organization_security_settings
  FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY scim_connections_admin ON public.scim_connections
  FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin'));

COMMENT ON TABLE public.enterprise_notifications IS 'In-app notification inbox for enterprise workspace users.';
COMMENT ON TABLE public.approval_requests IS 'Explicit approval workflow requests with assignee and decision history.';
COMMENT ON TABLE public.scim_connections IS 'SCIM provisioning placeholder — bearer token hash only, never store plaintext.';

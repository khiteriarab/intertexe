-- Activity vs audit, notifications, API credentials, storage, deletion jobs.

CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  previous_ref text,
  resulting_ref text,
  request_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  UNIQUE (organization_id, user_id, category)
);

CREATE TABLE IF NOT EXISTS public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  secret_hash text NOT NULL,
  last_used_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  url text NOT NULL,
  secret_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  passport_id uuid REFERENCES public.passports (id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  requested_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  bucket text NOT NULL,
  path text NOT NULL,
  mime_type text,
  byte_size integer,
  kind text NOT NULL DEFAULT 'document',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_deletion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_select ON public.activity_events FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY activity_insert ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (public.can_mutate_org(organization_id));

CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.org_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY notif_self ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = public.current_profile_id() AND public.is_org_member(organization_id))
  WITH CHECK (user_id = public.current_profile_id() AND public.is_org_member(organization_id));

CREATE POLICY api_creds_admin_select ON public.api_credentials FOR SELECT TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin', 'developer'));
CREATE POLICY api_creds_admin_write ON public.api_credentials FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin', 'developer'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin', 'developer'));

CREATE POLICY webhooks_admin ON public.webhooks FOR ALL TO authenticated
  USING (public.org_role(organization_id) IN ('owner', 'admin', 'developer'))
  WITH CHECK (public.org_role(organization_id) IN ('owner', 'admin', 'developer'));

CREATE POLICY analytics_select ON public.analytics_events FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id));

CREATE POLICY files_select ON public.files FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY files_mutate ON public.files FOR ALL TO authenticated
  USING (public.can_mutate_org(organization_id))
  WITH CHECK (public.can_mutate_org(organization_id));

-- Private org-aware buckets. Public passport assets stay in a separate bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('enterprise-imports', 'enterprise-imports', false),
  ('enterprise-evidence', 'enterprise-evidence', false),
  ('enterprise-supplier-uploads', 'enterprise-supplier-uploads', false),
  ('enterprise-exports', 'enterprise-exports', false),
  ('enterprise-qr-private', 'enterprise-qr-private', false),
  ('enterprise-documents', 'enterprise-documents', false),
  ('enterprise-passport-public', 'enterprise-passport-public', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY enterprise_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id LIKE 'enterprise-%'
    AND (storage.foldername(name))[1] IN (
      SELECT m.organization_id::text
      FROM public.organization_memberships m
      JOIN public.profiles p ON p.id = m.user_id
      WHERE p.auth_user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY enterprise_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id LIKE 'enterprise-%'
    AND bucket_id <> 'enterprise-passport-public'
    AND (storage.foldername(name))[1] IN (
      SELECT m.organization_id::text
      FROM public.organization_memberships m
      JOIN public.profiles p ON p.id = m.user_id
      WHERE p.auth_user_id = auth.uid()
        AND m.status = 'active'
        AND m.role NOT IN ('read_only', 'supplier_contributor')
    )
  );

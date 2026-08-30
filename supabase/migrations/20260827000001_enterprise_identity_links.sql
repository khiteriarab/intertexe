-- Staff identity mapping only. Not customer catalogs.
-- hq_user_id is consumer Auth uid. enterprise_user_id is obelisk-core Auth uid.
-- No foreign key across projects. Email is audit-only and must never authorize.

CREATE TABLE IF NOT EXISTS public.enterprise_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hq_user_id uuid NOT NULL UNIQUE,
  enterprise_user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  email_audit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  revoked_at timestamptz,
  revoked_by uuid
);

CREATE TABLE IF NOT EXISTS public.enterprise_handoff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  identity_link_id uuid NOT NULL REFERENCES public.enterprise_identity_links (id) ON DELETE CASCADE,
  hq_user_id uuid NOT NULL,
  enterprise_user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_identity_links_enterprise_user_idx
  ON public.enterprise_identity_links (enterprise_user_id);

CREATE INDEX IF NOT EXISTS enterprise_handoff_sessions_hq_user_idx
  ON public.enterprise_handoff_sessions (hq_user_id, expires_at);

COMMENT ON TABLE public.enterprise_identity_links IS
  'Approved HQ Auth uid → obelisk-core Auth uid mapping for INTERTEXE staff. Email is not authorization.';

ALTER TABLE public.enterprise_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_handoff_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.enterprise_identity_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.enterprise_handoff_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.enterprise_identity_links TO service_role;
GRANT ALL ON public.enterprise_handoff_sessions TO service_role;

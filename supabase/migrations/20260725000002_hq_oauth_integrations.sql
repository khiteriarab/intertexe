-- HQ OAuth integrations: encrypted tokens, metric snapshots, sync logs.

CREATE TABLE IF NOT EXISTS public.hq_oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL
    CHECK (provider IN (
      'google',
      'meta',
      'tiktok',
      'pinterest',
      'app_store_connect'
    )),
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'degraded', 'error', 'revoked', 'pending')),
  account_label text,
  external_account_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  access_token_enc text,
  refresh_token_enc text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_by_internal_user_id uuid REFERENCES public.hq_internal_users(id) ON DELETE SET NULL,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS hq_oauth_connections_workspace_idx
  ON public.hq_oauth_connections (workspace_id);

CREATE TABLE IF NOT EXISTS public.hq_integration_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  metric_date date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, metric_date)
);

CREATE INDEX IF NOT EXISTS hq_integration_metric_snapshots_lookup_idx
  ON public.hq_integration_metric_snapshots (workspace_id, provider, metric_date DESC);

ALTER TABLE public.hq_oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_integration_metric_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.hq_oauth_connections IS
  'OAuth (or App Store Connect key) credentials for HQ integrations. Tokens stored encrypted at rest.';
COMMENT ON COLUMN public.hq_oauth_connections.access_token_enc IS
  'AES-256-GCM ciphertext; never log or return to the browser.';
COMMENT ON COLUMN public.hq_oauth_connections.refresh_token_enc IS
  'AES-256-GCM ciphertext for refresh tokens when the provider issues them.';

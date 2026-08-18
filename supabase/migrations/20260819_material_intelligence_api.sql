-- Additive only: CREATE TABLE IF NOT EXISTS, indexes, RLS, and grants.
-- Does not alter products, barcode_compositions, or upc_brand_prefixes.
-- Reverse (manual, drops new objects only):
--   DROP TABLE IF EXISTS public.material_api_usage;
--   DROP TABLE IF EXISTS public.material_api_keys;
--   DROP TABLE IF EXISTS public.material_api_clients;
--   DROP TABLE IF EXISTS public.material_snapshot_leads;
--   DROP TABLE IF EXISTS public.material_evidence;

-- Material Intelligence API clients, hashed keys, usage, snapshot leads.
-- Service-role only: RLS enabled with no anon/authenticated policies.

CREATE TABLE IF NOT EXISTS public.material_api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text NOT NULL,
  plan text NOT NULL DEFAULT 'founding_pilot',
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  monthly_limit integer NOT NULL DEFAULT 5000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.material_api_clients(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  last_four text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.material_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.material_api_clients(id) ON DELETE SET NULL,
  key_id uuid REFERENCES public.material_api_keys(id) ON DELETE SET NULL,
  request_id text NOT NULL,
  gtin_length integer,
  match_status text,
  match_type text,
  evidence_status text,
  status_code integer NOT NULL,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_api_usage_key_created
  ON public.material_api_usage (key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS material_api_usage_client_created
  ON public.material_api_usage (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.material_snapshot_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  role text,
  company_website text,
  product_count text,
  sells_into_eu text,
  catalog_system text,
  intent text NOT NULL,
  source_cta text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_snapshot_leads_email_created
  ON public.material_snapshot_leads (lower(email), created_at DESC);

ALTER TABLE public.material_api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_snapshot_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.material_api_clients FROM anon, authenticated;
REVOKE ALL ON public.material_api_keys FROM anon, authenticated;
REVOKE ALL ON public.material_api_usage FROM anon, authenticated;
REVOKE ALL ON public.material_snapshot_leads FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.material_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upc_code text NOT NULL,
  source_type text NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'verified_label',
      'reported_brand',
      'reported_retailer',
      'inferred',
      'unknown_legacy',
      'missing'
    )
  ),
  raw_source_text text,
  captured_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_evidence_upc ON public.material_evidence (upc_code);

ALTER TABLE public.material_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.material_evidence FROM anon, authenticated;

GRANT ALL ON public.material_api_clients TO service_role;
GRANT ALL ON public.material_api_keys TO service_role;
GRANT ALL ON public.material_api_usage TO service_role;
GRANT ALL ON public.material_snapshot_leads TO service_role;
GRANT ALL ON public.material_evidence TO service_role;

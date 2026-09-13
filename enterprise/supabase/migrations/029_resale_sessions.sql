-- Resale sessions: brand-initiated or consumer-initiated lifecycle orchestration.
-- Separates Brand Product API (create session) from consumer OAuth (publish).

CREATE TYPE resale_session_status AS ENUM (
  'open',
  'draft_ready',
  'route_selected',
  'listed',
  'completed',
  'expired',
  'cancelled'
);

CREATE TYPE resale_route_kind AS ENUM (
  'marketplace_listing',
  'instant_buyout',
  'consignment',
  'brand_trade_in'
);

CREATE TABLE IF NOT EXISTS resale_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  public_id text NOT NULL,
  persistent_identity_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  owner_user_id uuid,
  initiated_by text NOT NULL DEFAULT 'consumer',
  brand_client_ref text,
  status resale_session_status NOT NULL DEFAULT 'open',
  valuation jsonb NOT NULL DEFAULT '{}',
  listing_draft jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  resale_item_id uuid REFERENCES resale_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resale_sessions_public_id ON resale_sessions(public_id);
CREATE INDEX IF NOT EXISTS idx_resale_sessions_owner ON resale_sessions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_resale_sessions_token ON resale_sessions(session_token);

CREATE TABLE IF NOT EXISTS resale_session_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES resale_sessions(id) ON DELETE CASCADE,
  route_kind resale_route_kind NOT NULL,
  provider text,
  label text NOT NULL,
  you_receive_amount numeric(12, 2),
  you_receive_label text,
  currency text NOT NULL DEFAULT 'USD',
  speed_label text,
  estimated_days_min int,
  estimated_days_max int,
  is_recommended boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  selected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resale_session_routes_session ON resale_session_routes(session_id);

COMMENT ON TABLE resale_sessions IS 'Temporary resale orchestration — brand creates session; owner completes with own marketplace OAuth.';
COMMENT ON TABLE resale_session_routes IS 'Compared resale routes: marketplace, instant buyout, consignment, trade-in.';

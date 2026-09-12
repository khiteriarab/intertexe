-- Phase 2: Next Life / resale orchestration
-- Links to persistent_identities — never duplicates product identity.

CREATE TYPE resale_item_status AS ENUM (
  'available',
  'draft',
  'listed',
  'offered',
  'sold',
  'transfer_pending',
  'transferred',
  'withdrawn'
);

CREATE TYPE resale_listing_status AS ENUM (
  'draft',
  'pending_publish',
  'published',
  'sold',
  'deactivated',
  'error',
  'handoff'
);

CREATE TYPE marketplace_provider AS ENUM ('ebay', 'vinted', 'poshmark');

CREATE TABLE IF NOT EXISTS resale_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  default_currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES resale_profiles(user_id) ON DELETE CASCADE,
  provider marketplace_provider NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  external_account_id text,
  external_account_label text,
  capabilities jsonb NOT NULL DEFAULT '{}',
  token_vault_key text,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS resale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persistent_identity_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  status resale_item_status NOT NULL DEFAULT 'available',
  condition_grade text,
  condition_notes text,
  flaws text,
  asking_price numeric(12, 2),
  minimum_price numeric(12, 2),
  currency text NOT NULL DEFAULT 'USD',
  integrity_status text NOT NULL DEFAULT 'unknown',
  resale_eligible boolean NOT NULL DEFAULT false,
  consumer_photos jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resale_items_identity ON resale_items(persistent_identity_id);
CREATE INDEX IF NOT EXISTS idx_resale_items_owner ON resale_items(owner_user_id);

CREATE TABLE IF NOT EXISTS resale_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resale_item_id uuid NOT NULL REFERENCES resale_items(id) ON DELETE CASCADE,
  provider marketplace_provider NOT NULL,
  external_listing_id text,
  external_url text,
  status resale_listing_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  asking_price numeric(12, 2),
  published_at timestamptz,
  sold_at timestamptz,
  last_synced_at timestamptz,
  provider_payload jsonb NOT NULL DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resale_item_id, provider)
);

CREATE TABLE IF NOT EXISTS resale_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resale_listing_id uuid NOT NULL REFERENCES resale_listings(id) ON DELETE CASCADE,
  provider marketplace_provider NOT NULL,
  external_offer_id text,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  received_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ownership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persistent_identity_id uuid NOT NULL,
  event_type text NOT NULL,
  owner_sequence int NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  public_summary text,
  private_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ownership_events_identity ON ownership_events(persistent_identity_id);

CREATE TABLE IF NOT EXISTS product_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persistent_identity_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  event_kind text NOT NULL,
  event_year int,
  public_label text NOT NULL,
  public_detail text,
  is_public boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'system',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_identity ON product_lifecycle_events(persistent_identity_id);

CREATE TABLE IF NOT EXISTS marketplace_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider marketplace_provider NOT NULL,
  external_event_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  processing_error text,
  idempotency_key text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE resale_items IS 'One INTERTEXE resale record per physical product identity — multi-marketplace via resale_listings.';
COMMENT ON COLUMN marketplace_connections.token_vault_key IS 'Reference to server-side secret store — never expose tokens to client.';

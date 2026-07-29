-- P0: versioned feed staging + promote history + ingest kill-switch keys.
-- Incomplete staging sessions must never mutate live products.

CREATE TABLE IF NOT EXISTS feed_staging_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'complete', 'validated', 'promoted', 'aborted', 'failed')),
  source text NOT NULL DEFAULT 'rakuten',
  file_offset integer NOT NULL DEFAULT 0,
  files_processed integer NOT NULL DEFAULT 0,
  total_catalog_files integer NOT NULL DEFAULT 0,
  cycle_complete boolean NOT NULL DEFAULT false,
  row_count integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  promoted_at timestamptz,
  abort_reason text
);

CREATE TABLE IF NOT EXISTS feed_staged_rows (
  session_id uuid NOT NULL REFERENCES feed_staging_sessions(session_id) ON DELETE CASCADE,
  product_id text NOT NULL,
  payload jsonb NOT NULL,
  merchant_id text,
  brand_slug text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS feed_staged_rows_session_idx
  ON feed_staged_rows (session_id);

CREATE INDEX IF NOT EXISTS feed_staging_sessions_status_idx
  ON feed_staging_sessions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS feed_promotion_history (
  promotion_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES feed_staging_sessions(session_id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  ok boolean,
  snapshot_id uuid,
  rows_promoted integer NOT NULL DEFAULT 0,
  smoke_ok boolean,
  rolled_back boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Seed kill switches clear (operators may block via scripts/set-catalog-kill-switch.mjs)
INSERT INTO system_status (key, value_json, updated_at)
VALUES
  (
    'feed_ingest_blocked',
    jsonb_build_object(
      'blocked', true,
      'reason', 'p0_default_ingest_blocked_until_stage_promote_proven',
      'at', now()
    ),
    now()
  ),
  (
    'catalog_publish_blocked',
    jsonb_build_object(
      'blocked', true,
      'reason', 'p0_default_publish_blocked_until_stage_promote_proven',
      'at', now()
    ),
    now()
  )
ON CONFLICT (key) DO UPDATE
SET
  value_json = EXCLUDED.value_json,
  updated_at = EXCLUDED.updated_at;

COMMENT ON TABLE feed_staging_sessions IS
  'Versioned Rakuten ingest sessions. Live products must only change via validated promote.';
COMMENT ON TABLE feed_staged_rows IS
  'Staged product payloads for a session. Never queried by customer-facing surfaces.';

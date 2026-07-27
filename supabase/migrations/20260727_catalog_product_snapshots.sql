-- P0 catalog immutability: row-level last-known-good snapshots for instant restore.
-- Metadata-only counts are NOT enough (incident 2026-07-27).

CREATE TABLE IF NOT EXISTS catalog_product_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  note text,
  product_count integer NOT NULL DEFAULT 0,
  displayable_count integer NOT NULL DEFAULT 0,
  brand_count integer NOT NULL DEFAULT 0,
  merchant_count integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS catalog_product_snapshot_rows (
  snapshot_id uuid NOT NULL REFERENCES catalog_product_snapshots(snapshot_id) ON DELETE CASCADE,
  product_id text NOT NULL,
  id uuid,
  is_active boolean,
  approved text,
  is_displayable boolean,
  brand_name text,
  merchant_id text,
  stock_status text,
  composition text,
  natural_fiber_percent numeric,
  PRIMARY KEY (snapshot_id, product_id)
);

CREATE INDEX IF NOT EXISTS catalog_product_snapshots_captured_at_idx
  ON catalog_product_snapshots (captured_at DESC);

CREATE INDEX IF NOT EXISTS catalog_product_snapshot_rows_snapshot_idx
  ON catalog_product_snapshot_rows (snapshot_id);

-- Convenience view of latest snapshot metadata
CREATE OR REPLACE VIEW catalog_latest_snapshot AS
SELECT *
FROM catalog_product_snapshots
ORDER BY captured_at DESC
LIMIT 1;

COMMENT ON TABLE catalog_product_snapshots IS
  'Full catalog flag snapshots for instant production restore. Prefer this over system_status.catalog_last_known_good counts.';

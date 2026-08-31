-- =============================================================================
-- Batched NFP mismatch repair (run in Supabase SQL Editor or psql)
-- ⚠️ DISABLED ON PRODUCTION — see docs/production-catalog-safety.md
-- Do not run manually unless CATALOG_BULK_MUTATIONS_ENABLED=true during maintenance.
-- Prereq: 20260830_fix_synthetic_nfp_mismatch.sql applied
-- Run repeatedly until remaining = 0. Tune batch size if IO is high.
-- =============================================================================

SET statement_timeout = '180s';

-- Preview remaining rows
SELECT public.count_synthetic_nfp_mismatch() AS remaining_mismatch;

-- One batch (default 2000 rows, ~30-90s depending on IO)
SELECT public.fix_synthetic_nfp_mismatch_batch(2000) AS rows_updated_this_batch;

-- Loop manually: re-run the batch SELECT until rows_updated_this_batch = 0
-- Or in psql:
-- \watch 2

-- After all batches complete:
SELECT public.count_synthetic_nfp_mismatch() AS remaining_mismatch;

-- Optional: refresh homepage cache so feed badges match
-- SELECT public.refresh_homepage_feeds_v2('us');

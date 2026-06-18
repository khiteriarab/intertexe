-- Catalog CPU + index tuning playbook (run in Supabase SQL editor).
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.

-- 1) Top CPU queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 2) Product column stats for common filters/sorts
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename = 'products'
  AND attname IN (
    'approved',
    'is_active',
    'natural_fiber_percent',
    'designer_slug',
    'brand_name',
    'region',
    'created_at',
    'first_seen_at',
    'is_new_arrival'
  )
ORDER BY attname;

-- 3) Existing products indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'products'
ORDER BY indexname;

-- 4) Build indexes (non-blocking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_approved_active
ON products(approved, is_active)
WHERE approved = 'yes' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_new_arrival
ON products(is_new_arrival, first_seen_at DESC)
WHERE is_new_arrival = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_designer_approved
ON products(designer_slug, approved, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_nfp_approved
ON products(natural_fiber_percent, approved)
WHERE natural_fiber_percent >= 80;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_region_approved
ON products(region, approved, is_active)
WHERE approved = 'yes' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at
ON products(created_at DESC)
WHERE approved = 'yes' AND is_active = true;

-- 5) Re-check indexes after creation
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'products'
  AND indexname IN (
    'idx_products_approved_active',
    'idx_products_new_arrival',
    'idx_products_designer_approved',
    'idx_products_nfp_approved',
    'idx_products_region_approved',
    'idx_products_created_at'
  )
ORDER BY indexname;

-- 6) Determine whether live_products_apparel is regular or materialized
SELECT definition
FROM pg_views
WHERE viewname = 'live_products_apparel';

SELECT matviewname
FROM pg_matviews
WHERE matviewname = 'live_products_apparel';

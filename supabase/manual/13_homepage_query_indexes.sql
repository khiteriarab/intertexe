-- Homepage query indexes (run in Supabase SQL editor or via Management API).
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.

-- New In / recent products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_products_created_at
ON products(created_at DESC)
WHERE approved = 'yes' AND is_active = true;

-- Sale rail (is_sale flag — not sale_price column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_products_sale
ON products(is_sale, created_at DESC)
WHERE approved = 'yes' AND is_active = true AND is_sale = true;

-- Featured / live designers with hero imagery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_designers_featured
ON designers(product_count DESC)
WHERE is_live = true AND hero_image IS NOT NULL;

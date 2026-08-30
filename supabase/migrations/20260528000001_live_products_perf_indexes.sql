-- Performance indexes for /api/catalog hot path.
-- live_products_apparel is a VIEW over products, so indexes must be on products.
CREATE INDEX IF NOT EXISTS idx_products_region_created
ON products(region, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_region_fiber
ON products(region, composition);

CREATE INDEX IF NOT EXISTS idx_products_sale
ON products(region, is_sale, created_at DESC)
WHERE is_sale = true;

-- Additive index so GTIN lookup can find a products row by UPC instead of
-- walking the live-catalog created_at index (~500k rows, >60s) and timing out.
-- Does not alter product columns or RLS.
-- Reverse: DROP INDEX IF EXISTS public.idx_products_upc;

CREATE INDEX IF NOT EXISTS idx_products_upc ON public.products (upc);

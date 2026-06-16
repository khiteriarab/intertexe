-- Materialize live_products_apparel for CPU relief (applied live 2026-06-16).
-- Run sections separately in SQL editor; CREATE MATERIALIZED VIEW may take 2+ minutes.

-- STEP 1 — Corrected products indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_approved
ON products(brand_slug, approved, is_active)
WHERE approved = 'yes' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_added_at_live
ON products(added_at DESC)
WHERE approved = 'yes' AND is_active = true;

-- STEP 2 — Capture base view query (do not use SELECT * FROM live_products_apparel after view swap)
-- SELECT pg_get_viewdef('public.live_products_apparel'::regclass, true);

-- STEP 3 — Materialized catalog (use pg_get_viewdef output as the AS query body)
-- CREATE MATERIALIZED VIEW public.live_products_apparel_mat AS
--   <pg_get_viewdef body without trailing semicolon>
-- WITH DATA;

-- STEP 4 — Mat view indexes (CONCURRENTLY refresh requires unique id index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_id ON public.live_products_apparel_mat(id);
CREATE INDEX IF NOT EXISTS idx_mat_region ON public.live_products_apparel_mat(region);
CREATE INDEX IF NOT EXISTS idx_mat_brand_slug ON public.live_products_apparel_mat(brand_slug);
CREATE INDEX IF NOT EXISTS idx_mat_nfp ON public.live_products_apparel_mat(natural_fiber_percent DESC);
CREATE INDEX IF NOT EXISTS idx_mat_created_at ON public.live_products_apparel_mat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mat_collection_slugs ON public.live_products_apparel_mat USING GIN(collection_slugs);
CREATE INDEX IF NOT EXISTS idx_mat_composition ON public.live_products_apparel_mat USING GIN(to_tsvector('english', coalesce(composition, '')));

-- STEP 5 — Thin view over mat (RPCs + legacy queries stay compatible)
CREATE OR REPLACE VIEW public.live_products_apparel AS
SELECT * FROM public.live_products_apparel_mat;

GRANT SELECT ON public.live_products_apparel_mat TO anon, authenticated, service_role;

-- STEP 6 — Nightly / post-sync refresh
CREATE OR REPLACE FUNCTION public.refresh_live_products_mat()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.live_products_apparel_mat;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_live_products_mat() TO service_role;

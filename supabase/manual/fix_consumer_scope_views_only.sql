-- Run this ONLY if 20240020 failed with:
--   cannot change name of view column "product_id" to "brand_slug"
-- Functions/columns from 20240020 may already exist — this fixes views only.

DROP VIEW IF EXISTS public.products_catalog_scope CASCADE;
DROP VIEW IF EXISTS public.live_products_apparel CASCADE;
DROP VIEW IF EXISTS public.live_products CASCADE;

CREATE VIEW public.live_products AS
SELECT p.*
FROM public.products AS p
WHERE p.approved = 'yes'
  AND coalesce(p.is_active, true) IS TRUE
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NULL;

CREATE VIEW public.live_products_apparel AS
SELECT p.*
FROM public.products AS p
WHERE p.approved = 'yes'
  AND coalesce(p.is_active, true) IS TRUE
  AND coalesce(p.natural_fiber_percent, 0) >= 80
  AND public.homepage_price_listed(p.price, p.image_url)
  AND public.catalog_product_url_valid(p.url)
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NULL
  AND public.catalog_is_womens_apparel_category(p.category, p.name);

CREATE VIEW public.products_catalog_scope AS
SELECT
  p.id,
  p.product_id,
  p.approved,
  p.is_active,
  p.region,
  p.brand_slug,
  p.category,
  p.natural_fiber_percent,
  public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) AS display_excluded_reason,
  CASE
    WHEN p.approved IS DISTINCT FROM 'yes' OR coalesce(p.is_active, true) IS FALSE THEN 'raw'
    WHEN public.catalog_consumer_exclusion_reason(
      p.category, p.name, p.composition, p.image_url, p.price, p.url
    ) IS NOT NULL THEN 'excluded'
    WHEN EXISTS (SELECT 1 FROM public.live_products_apparel l WHERE l.id = p.id) THEN 'consumer_apparel'
    WHEN EXISTS (SELECT 1 FROM public.live_products l WHERE l.id = p.id) THEN 'consumer_other'
    ELSE 'excluded'
  END AS catalog_scope
FROM public.products AS p;

GRANT SELECT ON public.live_products TO anon, authenticated, service_role;
GRANT SELECT ON public.live_products_apparel TO anon, authenticated, service_role;
GRANT SELECT ON public.products_catalog_scope TO anon, authenticated, service_role;

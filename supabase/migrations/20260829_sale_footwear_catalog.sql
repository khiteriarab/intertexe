-- Sale footwear catalog — shoes on markdown from live_products_footwear (apparel sale RPCs exclude footwear).

CREATE OR REPLACE FUNCTION public.sale_footwear_catalog_count(p_region text DEFAULT 'us')
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.live_products_footwear f
  WHERE lower(coalesce(f.region, 'us')) = lower(coalesce(nullif(trim(p_region), ''), 'us'))
    AND f.image_url IS NOT NULL
    AND btrim(coalesce(f.price::text, '')) <> ''
    AND public.catalog_offer_is_on_sale(f.is_sale, f.price::text, f.original_price::text);
$$;

CREATE OR REPLACE FUNCTION public.sale_footwear_catalog_list(
  p_region text DEFAULT 'us',
  p_limit int DEFAULT 48,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.live_products_footwear
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.*
  FROM public.live_products_footwear f
  WHERE lower(coalesce(f.region, 'us')) = lower(coalesce(nullif(trim(p_region), ''), 'us'))
    AND f.image_url IS NOT NULL
    AND btrim(coalesce(f.price::text, '')) <> ''
    AND public.catalog_offer_is_on_sale(f.is_sale, f.price::text, f.original_price::text)
  ORDER BY
    f.natural_fiber_percent DESC NULLS LAST,
    f.created_at DESC NULLS LAST
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.sale_footwear_catalog_count(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sale_footwear_catalog_list(text, int, int) TO anon, authenticated, service_role;

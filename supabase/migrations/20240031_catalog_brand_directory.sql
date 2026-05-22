-- Fast brand directory for /designers (replaces full-table scan in app).

CREATE OR REPLACE FUNCTION public.catalog_brand_directory(p_limit int DEFAULT 600)
RETURNS TABLE (
  brand_slug text,
  brand_name text,
  product_count bigint,
  avg_natural_fiber numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    l.brand_slug,
    max(l.brand_name) AS brand_name,
    count(*)::bigint AS product_count,
    round(avg(l.natural_fiber_percent))::numeric AS avg_natural_fiber
  FROM public.live_products_apparel l
  WHERE l.natural_fiber_percent >= 80
    AND l.brand_slug IS NOT NULL
    AND l.brand_slug <> ''
    AND l.image_url IS NOT NULL
    AND l.image_url <> ''
    AND l.price IS NOT NULL
    AND l.price::text <> ''
    AND l.price::text NOT IN ('0', '$0.00')
  GROUP BY l.brand_slug
  HAVING count(*) >= 2
  ORDER BY count(*) DESC
  LIMIT greatest(1, least(coalesce(p_limit, 600), 1200));
$$;

GRANT EXECUTE ON FUNCTION public.catalog_brand_directory(int) TO anon, authenticated, service_role;

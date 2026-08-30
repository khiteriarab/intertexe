-- P0 filter blockers: price-sort alias rewrite, sale list filters, bags classify,
-- shoes/knitwear/color indexes, trousers mapping.
-- Applied to production 2026-08-07 via Management API (chunked).

-- ---------------------------------------------------------------------------
-- 1) Price sort: replace(order_sql,'c.','u.') corrupted public. → publiu.
--    Fix is in live catalog_browse_page_v2 (regexp_replace word-boundary rewrite).
--    Re-apply from /tmp/fix_browse_price_sort.sql snapshot if needed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2) sale_catalog_list: optional category/brand/color; products-first hot path
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sale_catalog_list(text, text, text, numeric, int, int);

CREATE OR REPLACE FUNCTION public.sale_catalog_list(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit int DEFAULT 48,
  p_offset int DEFAULT 0,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_color text DEFAULT NULL
)
RETURNS SETOF public.live_products_apparel
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref text := lower(coalesce(nullif(trim(p_preferred_region), ''), 'us'));
  fall text := lower(coalesce(nullif(trim(p_fallback_region), ''), pref));
  gtypes text[] := CASE
    WHEN p_category IS NULL OR btrim(p_category) = '' OR lower(btrim(p_category)) IN ('all','apparel','clothing')
      THEN NULL
    ELSE public.catalog_shop_category_garment_types(p_category)
  END;
BEGIN
  RETURN QUERY
  SELECT l.*
  FROM (
    SELECT p.id
    FROM public.products p
    WHERE p.is_displayable IS TRUE
      AND p.is_sale IS TRUE
      AND coalesce(p.natural_fiber_percent, 0) >= 80
      AND lower(coalesce(p.region, '')) IN (pref, fall)
      AND (gtypes IS NULL OR p.garment_type = ANY (gtypes))
      AND (
        p_brand_slug IS NULL OR btrim(p_brand_slug) = ''
        OR lower(coalesce(p.brand_slug, '')) = lower(btrim(p_brand_slug))
      )
      AND (
        p_color IS NULL OR btrim(p_color) = ''
        OR lower(coalesce(p.color, '')) = lower(btrim(p_color))
      )
      AND (
        p_max_price IS NULL
        OR coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text)) <= p_max_price
      )
      AND (
        p_fiber IS NULL OR btrim(p_fiber) IN ('', 'all')
        OR lower(coalesce(p.composition,'')) LIKE '%' || lower(btrim(p_fiber)) || '%'
      )
    ORDER BY p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST, p.id DESC
    LIMIT greatest(1, least(coalesce(p_limit, 48), 500))
    OFFSET greatest(coalesce(p_offset, 0), 0)
  ) ids
  JOIN public.live_products_apparel l ON l.id = ids.id
  ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sale_catalog_list(text, text, text, numeric, int, int, text, text, text)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Bags classification (exact category — small set)
-- ---------------------------------------------------------------------------
UPDATE public.products
SET garment_type = 'bags', updated_at = now()
WHERE category = 'Luggage & Bags'
  AND coalesce(garment_type, '') NOT IN ('bags', 'handbags');

-- ---------------------------------------------------------------------------
-- 4) Trousers mapping: pants_trousers only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_shop_category_garment_types(p_category text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  c text := lower(trim(coalesce(p_category, '')));
BEGIN
  IF c = '' OR c = 'all' THEN RETURN NULL; END IF;
  c := replace(c, '-', '_');
  CASE c
    WHEN 'apparel', 'clothing' THEN RETURN NULL;
    WHEN 'dresses' THEN RETURN ARRAY['dresses']::text[];
    WHEN 'tops', 'tops_blouses', 'shirts', 't_shirts', 'tshirts' THEN
      RETURN ARRAY[
        'tops_blouses', 'shirts', 't_shirts', 'tanks', 'camisoles',
        'bodysuits', 'crop_tops', 'knit_tops'
      ]::text[];
    WHEN 'knitwear' THEN RETURN ARRAY['knitwear', 'sweaters_cardigans']::text[];
    WHEN 'bottoms', 'trousers', 'pants' THEN RETURN ARRAY['pants_trousers']::text[];
    WHEN 'shorts' THEN RETURN ARRAY['shorts']::text[];
    WHEN 'outerwear' THEN RETURN ARRAY['coats', 'jackets_blazers']::text[];
    WHEN 'skirts' THEN RETURN ARRAY['skirts']::text[];
    WHEN 'swimwear' THEN RETURN ARRAY['swim_resortwear']::text[];
    WHEN 'jumpsuits' THEN RETURN ARRAY['jumpsuits']::text[];
    WHEN 'lingerie' THEN RETURN ARRAY['lingerie']::text[];
    WHEN 'shoes' THEN RETURN ARRAY['shoes']::text[];
    WHEN 'bags' THEN RETURN ARRAY['bags', 'handbags']::text[];
    ELSE
      RETURN CASE
        WHEN public.catalog_normalize_garment_token(c) IS NULL THEN ARRAY[]::text[]
        ELSE ARRAY[public.catalog_normalize_garment_token(c)]::text[]
      END;
  END CASE;
END;
$$;

NOTIFY pgrst, 'reload schema';

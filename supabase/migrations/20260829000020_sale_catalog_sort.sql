-- Sale catalog: honor sort param for paginated price / newest / discount order.
-- Without this, sale_catalog_list always ordered by natural_fiber_percent DESC,
-- so client-side price sort on page 1 broke global order across pages.

DROP FUNCTION IF EXISTS public.sale_catalog_list(text, text, text, numeric, int, int, text, text, text);

CREATE OR REPLACE FUNCTION public.sale_catalog_list(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit int DEFAULT 48,
  p_offset int DEFAULT 0,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_sort text DEFAULT NULL
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
  sort_key text := lower(btrim(coalesce(p_sort, 'discount')));
  order_ids text;
  order_live text;
BEGIN
  IF sort_key IN ('price-low', 'price_asc', 'price-low-high', 'pricelowhigh') THEN
    order_ids := 'p.price_numeric ASC NULLS LAST, p.id DESC';
    order_live := 'public.catalog_product_price_numeric(l.price::text) ASC NULLS LAST, l.id DESC';
  ELSIF sort_key IN ('price-high', 'price_desc', 'price-high-low', 'pricehighlow') THEN
    order_ids := 'p.price_numeric DESC NULLS LAST, p.id DESC';
    order_live := 'public.catalog_product_price_numeric(l.price::text) DESC NULLS LAST, l.id DESC';
  ELSIF sort_key IN ('new', 'newest', 'new_in') THEN
    order_ids := 'p.created_at DESC NULLS LAST, p.id DESC';
    order_live := 'l.created_at DESC NULLS LAST, l.id DESC';
  ELSIF sort_key IN ('natural', 'natural-high', 'natural_high', 'most_natural') THEN
    order_ids := 'p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST, p.id DESC';
    order_live := 'l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST, l.id DESC';
  ELSE
    -- discount (default): biggest markdown first
    order_ids := $o$
      CASE
        WHEN public.catalog_product_price_numeric(p.original_price::text)
           > coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text))
         AND coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text)) > 0
        THEN (
          public.catalog_product_price_numeric(p.original_price::text)
          - coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text))
        ) / NULLIF(public.catalog_product_price_numeric(p.original_price::text), 0)
        ELSE 0
      END DESC NULLS LAST,
      p.created_at DESC NULLS LAST,
      p.id DESC
    $o$;
    order_live := $o$
      CASE
        WHEN public.catalog_product_price_numeric(l.original_price::text)
           > public.catalog_product_price_numeric(l.price::text)
         AND public.catalog_product_price_numeric(l.price::text) > 0
        THEN (
          public.catalog_product_price_numeric(l.original_price::text)
          - public.catalog_product_price_numeric(l.price::text)
        ) / NULLIF(public.catalog_product_price_numeric(l.original_price::text), 0)
        ELSE 0
      END DESC NULLS LAST,
      l.created_at DESC NULLS LAST,
      l.id DESC
    $o$;
  END IF;

  RETURN QUERY EXECUTE format(
    $sql$
      SELECT l.*
      FROM (
        SELECT p.id
        FROM public.products p
        WHERE p.is_displayable IS TRUE
          AND p.is_sale IS TRUE
          AND coalesce(p.natural_fiber_percent, 0) >= 80
          AND lower(coalesce(p.region, '')) IN (%L, %L)
          AND ($1 IS NULL OR p.garment_type = ANY ($1))
          AND (
            $2 IS NULL OR btrim($2) = ''
            OR lower(coalesce(p.brand_slug, '')) = lower(btrim($2))
          )
          AND (
            $3 IS NULL OR btrim($3) = ''
            OR lower(coalesce(p.color, '')) = lower(btrim($3))
          )
          AND (
            $4 IS NULL
            OR coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text)) <= $4
          )
          AND (
            $5 IS NULL OR btrim($5) IN ('', 'all')
            OR lower(coalesce(p.composition,'')) LIKE '%%' || lower(btrim($5)) || '%%'
          )
          AND p.price_numeric IS NOT NULL
          AND p.price_numeric > 0
        ORDER BY %s
        LIMIT %s
        OFFSET %s
      ) ids
      JOIN public.live_products_apparel l ON l.id = ids.id
      ORDER BY %s
    $sql$,
    pref,
    fall,
    order_ids,
    greatest(1, least(coalesce(p_limit, 48), 500)),
    greatest(coalesce(p_offset, 0), 0),
    order_live
  )
  USING gtypes, p_brand_slug, p_color, p_max_price, p_fiber;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sale_catalog_list(text, text, text, numeric, int, int, text, text, text, text)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

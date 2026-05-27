-- Harden live_products_apparel against obvious non-apparel entries.
DO $$
DECLARE
  col_list text;
  nfp_expr text := 'public.catalog_derived_natural_fiber_percent(p.composition, p.material_metadata, p.natural_fiber_percent::integer)::numeric';
  filter_nfp text := 'public.catalog_derived_natural_fiber_percent(p.composition, p.material_metadata, p.natural_fiber_percent::integer) >= 80';
BEGIN
  SELECT string_agg(
    CASE
      WHEN column_name = 'natural_fiber_percent' THEN nfp_expr || ' AS natural_fiber_percent'
      ELSE 'p.' || quote_ident(column_name)
    END,
    ', ' ORDER BY ordinal_position
  )
  INTO col_list
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products';

  EXECUTE format($v$
    CREATE OR REPLACE VIEW public.live_products_apparel AS
    SELECT %s
    FROM public.products AS p
    WHERE p.approved = 'yes'
      AND coalesce(p.is_active, true) IS TRUE
      AND %s
      AND public.homepage_price_listed(p.price, p.image_url)
      AND public.catalog_product_url_valid(p.url)
      AND public.catalog_consumer_exclusion_reason(
        p.category, p.name, p.composition, p.image_url, p.price, p.url
      ) IS NULL
      AND public.catalog_is_womens_apparel_category(p.category, p.name)
      AND p.name NOT ILIKE '%%lubricant%%'
      AND p.name NOT ILIKE '%%lube%%'
      AND p.name NOT ILIKE '%%supplement%%'
      AND p.name NOT ILIKE '%%vitamin%%'
      AND p.name NOT ILIKE '%%fragrance%%'
      AND p.name NOT ILIKE '%%perfume%%'
      AND p.name NOT ILIKE '%%skincare%%'
      AND p.name NOT ILIKE '%%serum%%'
      AND p.category NOT ILIKE '%%beauty%%'
      AND p.category NOT ILIKE '%%health%%'
      AND p.category NOT ILIKE '%%wellness%%'
  $v$, col_list, filter_nfp);
END $$;

NOTIFY pgrst, 'reload schema';

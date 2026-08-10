-- Knitwear / category price-sort performance
-- Root cause: ORDER BY coalesce(price_numeric, catalog_product_price_numeric(price))
-- prevented index use and forced per-row parsing when price_numeric was sparse.
--
-- 1) Prefer indexed price_numeric for sort predicates
-- 2) Partial indexes for garment_type + region + price
-- Backfill of price_numeric is applied separately in batches.

CREATE OR REPLACE FUNCTION public.catalog_browse_price_page_ids(
  p_region text,
  p_garment_types text[],
  p_brand_slug text,
  p_search text,
  p_sort text,
  p_limit integer,
  p_offset integer
)
RETURNS TABLE(ids uuid[], srcs text[], n integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(0, coalesce(p_offset, 0));
  sort_key text := lower(btrim(coalesce(p_sort, 'price_asc')));
  order_sql text;
  page_sql text;
  out_ids uuid[];
  out_srcs text[];
  out_n int;
  base_pred text;
BEGIN
  -- Index-friendly sorts: rely on maintained price_numeric / natural_fiber_percent columns.
  IF sort_key IN ('price_desc', 'price_high', 'pricehighlow') THEN
    order_sql := 'p.price_numeric DESC NULLS LAST, p.id DESC';
  ELSIF sort_key IN ('most_natural', 'mostnatural') THEN
    order_sql := 'p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC, p.id DESC';
  ELSE
    order_sql := 'p.price_numeric ASC NULLS LAST, p.id DESC';
  END IF;

  base_pred := format(
    $w$
      p.is_displayable IS TRUE
      AND p.region = %L
      AND p.is_active IS NOT FALSE
      AND (p.approved IS NULL OR p.approved = 'yes')
      AND p.composition IS NOT NULL
      AND btrim(p.composition) <> ''
      AND p.price_numeric IS NOT NULL
      AND p.price_numeric > 0
    $w$,
    lower(btrim(coalesce(p_region, 'us')))
  );

  IF p_garment_types IS NOT NULL AND coalesce(array_length(p_garment_types, 1), 0) > 0 THEN
    base_pred := base_pred || format(' AND p.garment_type = ANY(%L::text[])', p_garment_types);
  END IF;
  IF p_brand_slug IS NOT NULL AND btrim(p_brand_slug) <> '' THEN
    base_pred := base_pred || format(' AND p.brand_slug = %L', lower(btrim(p_brand_slug)));
  END IF;
  IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
    base_pred := base_pred || format(
      $w$ AND (p.name ILIKE '%%' || %L || '%%' OR p.brand_name ILIKE '%%' || %L || '%%') $w$,
      btrim(p_search), btrim(p_search)
    );
  END IF;

  page_sql := format($q$
    SELECT
      coalesce(array_agg(x.id ORDER BY x.ord), ARRAY[]::uuid[]),
      coalesce(array_agg(x.src ORDER BY x.ord), ARRAY[]::text[]),
      count(*)::int
    FROM (
      SELECT y.id, y.src, row_number() OVER () AS ord
      FROM (
        SELECT p.id,
          CASE
            WHEN p.garment_type IS NOT NULL THEN 'products.garment_type'
            ELSE 'products.structured_category'
          END AS src
        FROM public.products p
        WHERE %s
        ORDER BY %s
        LIMIT %s OFFSET %s
      ) y
    ) x
  $q$, base_pred, order_sql, lim + 1, off);

  EXECUTE page_sql INTO out_ids, out_srcs, out_n;
  ids := coalesce(out_ids, ARRAY[]::uuid[]);
  srcs := coalesce(out_srcs, ARRAY[]::text[]);
  n := coalesce(out_n, coalesce(array_length(ids, 1), 0));
  RETURN NEXT;
END;
$function$;

-- Category + price indexes (created after price_numeric backfill)
CREATE INDEX IF NOT EXISTS idx_products_gt_region_price_asc
  ON public.products (garment_type, region, price_numeric ASC NULLS LAST, id DESC)
  WHERE is_displayable IS TRUE
    AND price_numeric IS NOT NULL
    AND is_active IS NOT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_gt_region_price_desc
  ON public.products (garment_type, region, price_numeric DESC NULLS LAST, id DESC)
  WHERE is_displayable IS TRUE
    AND price_numeric IS NOT NULL
    AND is_active IS NOT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_knitwear_us_price_asc
  ON public.products (price_numeric ASC NULLS LAST, id DESC)
  WHERE is_displayable IS TRUE
    AND region = 'us'
    AND garment_type = ANY (ARRAY['knitwear'::text, 'sweaters_cardigans'::text])
    AND is_active IS NOT FALSE
    AND composition IS NOT NULL
    AND btrim(composition) <> ''
    AND price_numeric IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_knitwear_us_price_desc
  ON public.products (price_numeric DESC NULLS LAST, id DESC)
  WHERE is_displayable IS TRUE
    AND region = 'us'
    AND garment_type = ANY (ARRAY['knitwear'::text, 'sweaters_cardigans'::text])
    AND is_active IS NOT FALSE
    AND composition IS NOT NULL
    AND btrim(composition) <> ''
    AND price_numeric IS NOT NULL;

ANALYZE public.products;

-- Keep price_numeric fresh on write so price sorts stay indexable.
CREATE OR REPLACE FUNCTION public.products_sync_price_numeric()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.price IS NULL OR btrim(NEW.price::text) = '' THEN
    NEW.price_numeric := NULL;
  ELSIF NEW.price::text ~ '^[0-9]+([.][0-9]+)?$' THEN
    NEW.price_numeric := NEW.price::numeric;
  ELSE
    NEW.price_numeric := public.catalog_product_price_numeric(NEW.price::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_price_numeric ON public.products;
CREATE TRIGGER trg_products_sync_price_numeric
  BEFORE INSERT OR UPDATE OF price ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_sync_price_numeric();

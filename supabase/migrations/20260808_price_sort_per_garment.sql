-- Fix category + price_asc/desc latency.
-- Root cause: garment_type = ANY(ARRAY[...]) + ORDER BY price forces bitmap+heapsort
-- (~10–20s for knitwear). Newest path already walks one garment_type at a time.
-- Mirror that for price sorts: per-type LIMIT, UNION ALL, then merge-sort page.

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
  order_u text;
  page_sql text;
  out_ids uuid[];
  out_srcs text[];
  out_n int;
  base_pred text;
  gt text;
  branch_sqls text[] := ARRAY[]::text[];
  gt_count int := coalesce(array_length(p_garment_types, 1), 0);
  use_per_garment boolean;
BEGIN
  IF sort_key IN ('price_desc', 'price_high', 'pricehighlow') THEN
    -- No NULLS LAST: price_numeric IS NOT NULL already. NULLS LAST makes the
    -- planner prefer a region-wide price index and filter garment_type late (~60s).
    order_sql := 'p.price_numeric DESC, p.id DESC';
    order_u := 'u.price_numeric DESC, u.id DESC';
  ELSIF sort_key IN ('most_natural', 'mostnatural') THEN
    order_sql := 'p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC, p.id DESC';
    order_u := 'u.natural_fiber_percent DESC NULLS LAST, u.created_at DESC, u.id DESC';
  ELSE
    order_sql := 'p.price_numeric ASC, p.id DESC';
    order_u := 'u.price_numeric ASC, u.id DESC';
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

  IF p_brand_slug IS NOT NULL AND btrim(p_brand_slug) <> '' THEN
    base_pred := base_pred || format(' AND p.brand_slug = %L', lower(btrim(p_brand_slug)));
  END IF;
  IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
    base_pred := base_pred || format(
      $w$ AND (p.name ILIKE '%%' || %L || '%%' OR p.brand_name ILIKE '%%' || %L || '%%') $w$,
      btrim(p_search), btrim(p_search)
    );
  END IF;

  -- Hot path: 1–8 garment types, no free-text search → equality scans hit
  -- idx_products_gt_region_price_* (or category partials like knitwear).
  use_per_garment :=
    gt_count BETWEEN 1 AND 8
    AND (p_search IS NULL OR btrim(p_search) = '');

  IF use_per_garment THEN
    FOREACH gt IN ARRAY p_garment_types LOOP
      IF gt IS NULL OR btrim(gt) = '' THEN
        CONTINUE;
      END IF;
      branch_sqls := branch_sqls || format(
        $q$(
          SELECT p.id,
                 p.price_numeric,
                 p.natural_fiber_percent,
                 p.created_at,
                 'products.garment_type'::text AS src
          FROM public.products p
          WHERE %s
            AND p.garment_type = %L
          ORDER BY %s
          LIMIT %s
        )$q$,
        base_pred,
        gt,
        order_sql,
        off + lim + 1
      );
    END LOOP;

    IF coalesce(array_length(branch_sqls, 1), 0) = 0 THEN
      ids := ARRAY[]::uuid[];
      srcs := ARRAY[]::text[];
      n := 0;
      RETURN NEXT;
      RETURN;
    END IF;

    page_sql := format(
      $q$
        SELECT
          coalesce(array_agg(x.id ORDER BY x.ord), ARRAY[]::uuid[]),
          coalesce(array_agg(x.src ORDER BY x.ord), ARRAY[]::text[]),
          count(*)::int
        FROM (
          SELECT z.id, z.src, row_number() OVER () AS ord
          FROM (
            SELECT u.id, u.src
            FROM (
              %s
            ) u
            ORDER BY %s
            LIMIT %s OFFSET %s
          ) z
        ) x
      $q$,
      array_to_string(branch_sqls, ' UNION ALL '),
      order_u,
      lim + 1,
      off
    );
  ELSE
    IF gt_count > 0 THEN
      base_pred := base_pred || format(' AND p.garment_type = ANY(%L::text[])', p_garment_types);
    END IF;

    page_sql := format(
      $q$
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
      $q$,
      base_pred,
      order_sql,
      lim + 1,
      off
    );
  END IF;

  EXECUTE page_sql INTO out_ids, out_srcs, out_n;
  ids := coalesce(out_ids, ARRAY[]::uuid[]);
  srcs := coalesce(out_srcs, ARRAY[]::text[]);
  n := coalesce(out_n, coalesce(array_length(ids, 1), 0));
  RETURN NEXT;
END;
$function$;

-- Help planner pick equality + price index for each garment type.
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

ANALYZE public.products;

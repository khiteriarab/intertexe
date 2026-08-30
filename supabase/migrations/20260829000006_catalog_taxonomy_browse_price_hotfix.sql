-- ⚠️  SUPERSEDED — DO NOT RE-APPLY. Slow path (full filtered COUNT). Canonical: lib/sql/catalog_taxonomy_browse_page.sql
-- Hotfix: live_products_* views have no price_numeric column.
-- Use catalog_product_price_numeric(price::text) for filters and sort.

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_browse_page(
  p_region text DEFAULT 'us',
  p_taxonomy_slug text DEFAULT NULL,
  p_material_family text DEFAULT NULL,
  p_material_subtype text DEFAULT NULL,
  p_fabric_construction text DEFAULT NULL,
  p_min_nfp int DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := lower(coalesce(nullif(trim(p_region), ''), 'us'));
  slugs text[] := public.catalog_taxonomy_filter_slugs(p_taxonomy_slug);
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb,
      'has_more', false,
      'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_taxonomy_browse_page')
    );
  END IF;

  WITH eligible AS (
    SELECT DISTINCT pta.offer_id
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_slug = ANY(slugs)
  ),
  filtered AS (
    SELECT l.*
    FROM public.live_products_apparel l
    JOIN eligible e ON e.offer_id = l.id
    WHERE lower(coalesce(l.region, '')) = reg
      AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = ''
        OR lower(coalesce(l.brand_slug, '')) = lower(btrim(p_brand_slug)))
      AND (p_color IS NULL OR btrim(p_color) = ''
        OR lower(coalesce(l.color, '')) = lower(btrim(p_color)))
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR lower(coalesce(l.name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
        OR lower(coalesce(l.brand_name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
      )
      AND (
        p_min_price IS NULL
        OR public.catalog_product_price_numeric(l.price::text) >= p_min_price
      )
      AND (
        p_max_price IS NULL
        OR public.catalog_product_price_numeric(l.price::text) <= p_max_price
      )
      AND (
        p_min_nfp IS NULL OR coalesce(l.natural_fiber_percent, 0) >= p_min_nfp
      )
      AND (
        p_material_family IS NULL OR btrim(p_material_family) = ''
        OR lower(coalesce(l.fiber_primary, '')) = lower(btrim(p_material_family))
        OR lower(coalesce(l.composition, '')) LIKE '%' || lower(btrim(p_material_family)) || '%'
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS n FROM filtered
  ),
  paged AS (
    SELECT f.*
    FROM filtered f
    ORDER BY
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_asc', 'price-low') THEN
        public.catalog_product_price_numeric(f.price::text) END ASC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_desc', 'price-high') THEN
        public.catalog_product_price_numeric(f.price::text) END DESC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) = 'most_natural' THEN f.natural_fiber_percent END DESC NULLS LAST,
      f.is_editor_pick DESC NULLS LAST,
      f.created_at DESC NULLS LAST,
      f.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT c.n,
    coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more
  FROM counted c
  LEFT JOIN LATERAL (SELECT * FROM paged LIMIT lim) p ON true
  GROUP BY c.n;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'exact',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_footwear_taxonomy_browse_page(
  p_region text DEFAULT 'us',
  p_taxonomy_slug text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := lower(coalesce(nullif(trim(p_region), ''), 'us'));
  slugs text[] := public.catalog_taxonomy_filter_slugs(p_taxonomy_slug);
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb,
      'has_more', false,
      'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_footwear_taxonomy_browse_page')
    );
  END IF;

  WITH eligible AS (
    SELECT DISTINCT pta.offer_id
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_slug = ANY(slugs)
  ),
  filtered AS (
    SELECT f.*
    FROM public.live_products_footwear f
    JOIN eligible e ON e.offer_id = f.id
    WHERE lower(coalesce(f.region, '')) = reg
      AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = ''
        OR lower(coalesce(f.brand_slug, '')) = lower(btrim(p_brand_slug)))
      AND (p_color IS NULL OR btrim(p_color) = ''
        OR lower(coalesce(f.color, '')) = lower(btrim(p_color)))
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR lower(coalesce(f.name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
      )
      AND (
        p_min_price IS NULL
        OR public.catalog_product_price_numeric(f.price::text) >= p_min_price
      )
      AND (
        p_max_price IS NULL
        OR public.catalog_product_price_numeric(f.price::text) <= p_max_price
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS n FROM filtered
  ),
  paged AS (
    SELECT fl.*
    FROM filtered fl
    ORDER BY
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_asc', 'price-low') THEN
        public.catalog_product_price_numeric(fl.price::text) END ASC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_desc', 'price-high') THEN
        public.catalog_product_price_numeric(fl.price::text) END DESC NULLS LAST,
      fl.natural_fiber_percent DESC NULLS LAST,
      fl.created_at DESC NULLS LAST,
      fl.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT c.n,
    coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more
  FROM counted c
  LEFT JOIN LATERAL (SELECT * FROM paged LIMIT lim) p ON true
  GROUP BY c.n;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'exact',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_footwear_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

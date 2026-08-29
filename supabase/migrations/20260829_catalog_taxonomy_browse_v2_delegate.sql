-- Regression fix: leaf taxonomy browse was doing full card-dedupe + COUNT (25–60s timeouts).
-- Delegate mappable clothing/* slugs to catalog_browse_page_v2; fast EXISTS page for the rest.

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_legacy_category(p_taxonomy_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE lower(trim(split_part(coalesce(p_taxonomy_slug, ''), '/', 2)))
    WHEN 'dresses' THEN 'dresses'
    WHEN 'bridal-dresses' THEN 'dresses'
    WHEN 'shirts' THEN 'shirts'
    WHEN 'blouses' THEN 'blouses'
    WHEN 'tanks-and-camisoles' THEN 'tops'
    WHEN 't-shirts' THEN 'tops'
    WHEN 'tops' THEN 'tops'
    WHEN 'knitwear' THEN 'knitwear'
    WHEN 'trousers' THEN 'trousers'
    WHEN 'jeans' THEN 'jeans'
    WHEN 'bottoms' THEN 'trousers'
    WHEN 'shorts' THEN 'shorts'
    WHEN 'skirts' THEN 'skirts'
    WHEN 'jackets' THEN 'jackets'
    WHEN 'coats' THEN 'coats'
    WHEN 'lingerie' THEN 'lingerie'
    WHEN 'swimwear' THEN 'swimwear'
    WHEN 'jumpsuits' THEN 'jumpsuits'
    ELSE NULL
  END;
$$;

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
  slug text := lower(trim(coalesce(p_taxonomy_slug, '')));
  slugs text[] := public.catalog_taxonomy_filter_slugs(p_taxonomy_slug);
  legacy_cat text := public.catalog_taxonomy_legacy_category(p_taxonomy_slug);
  is_all boolean := slug = 'clothing/all';
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF is_all THEN
    RETURN public.catalog_browse_page_v2(
      p_region := reg,
      p_category := 'clothing',
      p_material_family := p_material_family,
      p_material_subtype := p_material_subtype,
      p_fabric_construction := p_fabric_construction,
      p_min_nfp := p_min_nfp,
      p_max_synthetic := NULL,
      p_color := p_color,
      p_brand_slug := p_brand_slug,
      p_search := p_search,
      p_min_price := p_min_price,
      p_max_price := p_max_price,
      p_include_unverified := false,
      p_sort := p_sort,
      p_limit := lim,
      p_offset := off
    );
  END IF;

  IF legacy_cat IS NOT NULL THEN
    RETURN public.catalog_browse_page_v2(
      p_region := reg,
      p_category := legacy_cat,
      p_material_family := p_material_family,
      p_material_subtype := p_material_subtype,
      p_fabric_construction := p_fabric_construction,
      p_min_nfp := p_min_nfp,
      p_max_synthetic := NULL,
      p_color := p_color,
      p_brand_slug := p_brand_slug,
      p_search := p_search,
      p_min_price := p_min_price,
      p_max_price := p_max_price,
      p_include_unverified := false,
      p_sort := p_sort,
      p_limit := lim,
      p_offset := off
    );
  END IF;

  IF slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb, 'has_more', false, 'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_taxonomy_browse_page')
    );
  END IF;

  -- Small/special slugs (sleepwear, matching-sets): page only — no card dedupe or full COUNT.
  WITH paged AS (
    SELECT l.*
    FROM public.live_products_apparel l
    WHERE lower(coalesce(l.region, '')) = reg
      AND EXISTS (
        SELECT 1 FROM public.product_taxonomy_assignments pta
        WHERE pta.offer_id = l.id
          AND pta.taxonomy_version = 'retail-v1'
          AND pta.is_primary IS TRUE
          AND pta.taxonomy_slug = ANY(slugs)
      )
      AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = ''
        OR lower(coalesce(l.brand_slug, '')) = lower(btrim(p_brand_slug)))
      AND (p_color IS NULL OR btrim(p_color) = ''
        OR lower(coalesce(l.color, '')) = lower(btrim(p_color)))
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR lower(coalesce(l.name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
        OR lower(coalesce(l.brand_name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
      )
      AND (p_min_price IS NULL OR public.catalog_product_price_numeric(l.price::text) >= p_min_price)
      AND (p_max_price IS NULL OR public.catalog_product_price_numeric(l.price::text) <= p_max_price)
      AND (p_min_nfp IS NULL OR coalesce(l.natural_fiber_percent, 0) >= p_min_nfp)
      AND (
        p_material_family IS NULL OR btrim(p_material_family) = ''
        OR lower(coalesce(l.fiber_primary, '')) = lower(btrim(p_material_family))
        OR lower(coalesce(l.composition, '')) LIKE '%' || lower(btrim(p_material_family)) || '%'
      )
    ORDER BY
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_asc', 'price-low') THEN
        public.catalog_product_price_numeric(l.price::text) END ASC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_desc', 'price-high') THEN
        public.catalog_product_price_numeric(l.price::text) END DESC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) = 'most_natural' THEN l.natural_fiber_percent END DESC NULLS LAST,
      l.created_at DESC NULLS LAST,
      l.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT
    (
      SELECT count(*)::bigint
      FROM public.product_taxonomy_assignments pta
      WHERE pta.taxonomy_version = 'retail-v1'
        AND pta.is_primary IS TRUE
        AND pta.taxonomy_slug = ANY(slugs)
    ),
    coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM paged LIMIT lim) p), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'estimated',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug,
      'scope', 'taxonomy_assignment_fast'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_legacy_category(text) TO service_role;

NOTIFY pgrst, 'reload schema';

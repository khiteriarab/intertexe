-- Stable catalog_list pagination + canonical tie-break (prevents duplicate cards across pages).
-- Apply in SQL Editor after 20240029.

CREATE OR REPLACE FUNCTION public.catalog_list(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_nfp int DEFAULT 80,
  p_limit int DEFAULT 60,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.live_products_apparel
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := greatest(1, least(coalesce(p_limit, 60), 500));
  off int := greatest(0, coalesce(p_offset, 0));
  min_nfp int := greatest(0, least(coalesce(p_min_nfp, 80), 100));
  pref text := lower(coalesce(nullif(btrim(p_preferred_region), ''), 'us'));
  fb text := lower(coalesce(nullif(btrim(p_fallback_region), ''), 'us'));
  garment_types text[];
BEGIN
  SET LOCAL statement_timeout = '12s';

  garment_types := public.catalog_shop_category_garment_types(p_category);

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id,
      p.region,
      p.natural_fiber_percent,
      p.created_at,
      coalesce(
        p.canonical_id::text,
        public.catalog_dedupe_key(p.image_url, p.brand_name, p.name, p.composition, p.product_id, p.id)
      ) AS card_key
    FROM public.product_offer_classification c
    INNER JOIN public.products p ON p.id = c.offer_id
    WHERE c.completeness_status = 'complete'
      AND p.approved = 'yes'
      AND coalesce(p.is_active, true) IS TRUE
      AND coalesce(p.natural_fiber_percent, 0) >= min_nfp
      AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = '' OR p.brand_slug = lower(btrim(p_brand_slug)))
      AND public.catalog_fiber_filter_pass(p_fiber, c.material_primary, p.category, p.name, p.composition)
      AND (
        garment_types IS NULL
        OR c.garment_type = ANY (garment_types)
      )
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR p.name ILIKE '%' || btrim(p_search) || '%'
        OR p.brand_name ILIKE '%' || btrim(p_search) || '%'
        OR p.composition ILIKE '%' || btrim(p_search) || '%'
      )
  ),
  ranked AS (
    SELECT
      c.id,
      c.natural_fiber_percent,
      c.created_at,
      row_number() OVER (
        PARTITION BY c.card_key
        ORDER BY
          CASE lower(coalesce(c.region, 'us'))
            WHEN pref THEN 0
            WHEN fb THEN 1
            WHEN 'us' THEN 2
            WHEN 'uk' THEN 3
            WHEN 'eu' THEN 4
            ELSE 5
          END,
          c.natural_fiber_percent DESC NULLS LAST,
          c.created_at DESC NULLS LAST,
          c.id ASC
      ) AS card_rank
    FROM candidates c
  ),
  page AS (
    SELECT r.id
    FROM ranked r
    WHERE r.card_rank = 1
    ORDER BY r.created_at DESC NULLS LAST, r.id ASC
    LIMIT lim
    OFFSET off
  )
  SELECT l.*
  FROM public.live_products_apparel l
  INNER JOIN page pg ON pg.id = l.id
  ORDER BY l.created_at DESC NULLS LAST, l.id ASC;
END;
$$;

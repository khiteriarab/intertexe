-- Merge duplicate designer directory rows (e.g. a-l-c vs a-l-c-) and harden kids exclusion.

CREATE OR REPLACE FUNCTION public.catalog_normalize_brand_key(p_name text, p_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(
    trim(
      regexp_replace(
        coalesce(nullif(trim(p_name), ''), replace(coalesce(p_slug, ''), '-', ' ')),
        '[^a-z0-9]+',
        ' ',
        'gi'
      )
    )
  );
$$;

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
  WITH per_slug AS (
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
  ),
  merged AS (
    SELECT
      (array_agg(ps.brand_slug ORDER BY ps.product_count DESC, ps.brand_slug))[1] AS brand_slug,
      max(ps.brand_name) AS brand_name,
      sum(ps.product_count)::bigint AS product_count,
      round(avg(ps.avg_natural_fiber))::numeric AS avg_natural_fiber
    FROM per_slug ps
    GROUP BY public.catalog_normalize_brand_key(ps.brand_name, ps.brand_slug)
  )
  SELECT brand_slug, brand_name, product_count, avg_natural_fiber
  FROM merged
  ORDER BY product_count DESC
  LIMIT greatest(1, least(coalesce(p_limit, 600), 1200));
$$;

GRANT EXECUTE ON FUNCTION public.catalog_normalize_brand_key(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_brand_directory(int) TO anon, authenticated, service_role;

-- Expand kids / youth exclusion in consumer gate (name + category).
CREATE OR REPLACE FUNCTION public.catalog_consumer_exclusion_reason(
  p_category text,
  p_name text,
  p_composition text,
  p_image_url text,
  p_price text,
  p_url text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := lower(trim(coalesce(p_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
BEGIN
  IF p_image_url IS NULL OR trim(coalesce(p_image_url, '')) = '' THEN
    RETURN 'missing_image';
  END IF;
  IF p_price IS NULL OR trim(coalesce(p_price, '')) = ''
     OR lower(trim(p_price)) IN ('n/a', 'na', '0', '0.00', '$0', '$0.00') THEN
    RETURN 'missing_price';
  END IF;
  IF NOT public.catalog_product_url_valid(p_url) THEN
    RETURN 'missing_url';
  END IF;
  IF p_composition IS NULL OR trim(coalesce(p_composition, '')) = '' THEN
    RETURN 'missing_composition';
  END IF;

  IF cat ~ '(shoe|footwear|sandal|boot|sneaker|heel|pump|loafer|flat|mule)'
     OR nam ~ '(shoe|sandal|boot|sneaker|heel|pump|loafer|mule)' THEN
    RETURN 'shoes';
  END IF;
  IF cat ~ '(bag|handbag|tote|clutch|pouch|wallet|backpack)' OR nam ~ '(handbag|tote bag|clutch)' THEN
    RETURN 'bags';
  END IF;
  IF cat ~ '(jewelry|jewellery|earring|necklace|bracelet|brooch)' OR nam ~ '(earring|necklace|bracelet|brooch)' THEN
    RETURN 'jewelry';
  END IF;
  IF cat LIKE '%watch%' OR nam LIKE '% watch %' OR nam LIKE 'watch %' THEN
    RETURN 'watches';
  END IF;
  IF cat ~ '(belt|scarf|hat|cap|glove|sunglass|eyewear|accessory|accessories)' THEN
    RETURN 'accessories';
  END IF;
  IF (cat LIKE '%mens%' OR cat LIKE 'men%' OR nam LIKE '% for men%' OR nam LIKE '% mens %')
     AND cat NOT LIKE '%women%' AND cat NOT LIKE '%woman%'
     AND nam NOT LIKE '%women%' AND nam NOT LIKE '%woman%' THEN
    RETURN 'mens';
  END IF;
  IF cat ~ '(kid|kids|child|children|girl|boy|baby|infant|toddler|junior|youth|newborn)'
     OR nam ~ '(kid|kids|children|child|baby|infant|toddler|junior|youth|newborn|little ones)'
     OR nam ~ '\yboys\y|\ygirls\y' THEN
    RETURN 'kids';
  END IF;
  IF cat ~ '(beauty|fragrance|perfume|makeup|skincare|cosmetic|home|decor|furniture|candle)' THEN
    RETURN 'beauty_home';
  END IF;

  IF NOT public.catalog_is_womens_apparel_category(p_category, p_name) THEN
    RETURN 'not_womens_apparel';
  END IF;

  RETURN NULL;
END;
$$;

-- Extra live view guards (belt-and-suspenders for feed sync surfaces).
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
      AND p.name NOT ILIKE '%%kids%%'
      AND p.name NOT ILIKE '%%children%%'
      AND p.name NOT ILIKE '%%child''s%%'
      AND p.name NOT ILIKE '%%baby%%'
      AND p.name NOT ILIKE '%%infant%%'
      AND p.name NOT ILIKE '%%toddler%%'
      AND p.name NOT ILIKE '%%junior%%'
      AND p.name NOT ILIKE '%%youth%%'
      AND p.name NOT ILIKE '%%newborn%%'
      AND p.name NOT ILIKE '%% boys %%'
      AND p.name NOT ILIKE '%% girls %%'
      AND (
        p.category IS NULL
        OR (
          p.category NOT ILIKE '%%kids%%'
          AND p.category NOT ILIKE '%%children%%'
          AND p.category NOT ILIKE '%%baby%%'
          AND p.category NOT ILIKE '%%junior%%'
          AND p.category NOT ILIKE '%%youth%%'
        )
      )
  $v$, col_list, filter_nfp);
END $$;

NOTIFY pgrst, 'reload schema';

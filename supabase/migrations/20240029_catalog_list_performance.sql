-- =============================================================================
-- Catalog browse performance: fast catalog_list, single catalog_list_count,
-- classification summary view, material hub counts.
-- Apply in SQL Editor after 20240027 + 20240028.
-- =============================================================================

-- Drop ambiguous catalog_list_count overloads (int vs numeric)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_list_count'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig::text;
  END LOOP;
END $$;

-- Optional: drop duplicate catalog_list overloads if any
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'catalog_list'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig::text;
  END LOOP;
END $$;

-- Indexed filters on pre-classified rows (avoids live_products_apparel view scan)
CREATE INDEX IF NOT EXISTS idx_poc_complete_material_garment
  ON public.product_offer_classification (material_primary, garment_type, offer_id)
  WHERE completeness_status = 'complete';

CREATE INDEX IF NOT EXISTS idx_products_catalog_browse
  ON public.products (natural_fiber_percent DESC, created_at DESC)
  WHERE approved = 'yes'
    AND coalesce(is_active, true) IS TRUE
    AND coalesce(natural_fiber_percent, 0) >= 80;

CREATE INDEX IF NOT EXISTS idx_products_brand_slug_active
  ON public.products (brand_slug)
  WHERE approved = 'yes' AND coalesce(is_active, true) IS TRUE;

-- Fast fiber match using indexed material_primary (denim still uses text probe)
CREATE OR REPLACE FUNCTION public.catalog_fiber_filter_pass(
  p_fiber text,
  p_material_primary text,
  p_category text,
  p_name text,
  p_composition text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_fiber IS NULL OR btrim(p_fiber) IN ('', 'all') THEN true
    WHEN lower(btrim(p_fiber)) IN ('denim', 'jeans', 'jean') THEN
      coalesce(p_category, '') ~* '(denim|jean)'
      OR coalesce(p_name, '') ~* '(denim|jean)'
      OR coalesce(p_composition, '') ~* '(denim|jean)'
    ELSE
      p_material_primary = public.catalog_shop_fiber_to_material(p_fiber)
      OR (
        public.catalog_shop_fiber_to_material(p_fiber) IS NULL
        AND coalesce(p_composition, '') ILIKE '%' || lower(btrim(p_fiber)) || '%'
      )
  END;
$$;

-- -----------------------------------------------------------------------------
-- catalog_list — classification-indexed path (target <2s for material/category pages)
-- -----------------------------------------------------------------------------
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
          c.created_at DESC NULLS LAST
      ) AS card_rank
    FROM candidates c
  ),
  page AS (
    SELECT r.id
    FROM ranked r
    WHERE r.card_rank = 1
    ORDER BY r.natural_fiber_percent DESC NULLS LAST, r.created_at DESC NULLS LAST
    LIMIT lim
    OFFSET off
  )
  SELECT l.*
  FROM public.live_products_apparel l
  INNER JOIN page pg ON pg.id = l.id
  ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST;
END;
$$;

-- -----------------------------------------------------------------------------
-- catalog_list_count — same filter path, one canonical signature (int min_nfp)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_list_count(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_nfp int DEFAULT 80
)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_nfp int := greatest(0, least(coalesce(p_min_nfp, 80), 100));
  garment_types text[];
  cnt bigint;
BEGIN
  SET LOCAL statement_timeout = '12s';

  garment_types := public.catalog_shop_category_garment_types(p_category);

  SELECT count(DISTINCT coalesce(
    p.canonical_id::text,
    public.catalog_dedupe_key(p.image_url, p.brand_name, p.name, p.composition, p.product_id, p.id)
  ))::bigint INTO cnt
  FROM public.product_offer_classification c
  INNER JOIN public.products p ON p.id = c.offer_id
  WHERE c.completeness_status = 'complete'
    AND p.approved = 'yes'
    AND coalesce(p.is_active, true) IS TRUE
    AND coalesce(p.natural_fiber_percent, 0) >= min_nfp
    AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = '' OR p.brand_slug = lower(btrim(p_brand_slug)))
    AND public.catalog_fiber_filter_pass(p_fiber, c.material_primary, p.category, p.name, p.composition)
    AND (garment_types IS NULL OR c.garment_type = ANY (garment_types))
    AND (
      p_search IS NULL OR btrim(p_search) = ''
      OR p.name ILIKE '%' || btrim(p_search) || '%'
      OR p.brand_name ILIKE '%' || btrim(p_search) || '%'
      OR p.composition ILIKE '%' || btrim(p_search) || '%'
    );

  RETURN coalesce(cnt, 0);
END;
$$;

-- -----------------------------------------------------------------------------
-- Material hub counts (fast meta for /materials/* without full catalog_list_count)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_material_hub_counts (
  fiber text NOT NULL,
  category text NOT NULL DEFAULT '',
  card_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fiber, category)
);

CREATE OR REPLACE FUNCTION public.catalog_refresh_material_hub_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  SET LOCAL statement_timeout = '300s';
  TRUNCATE public.catalog_material_hub_counts;

  INSERT INTO public.catalog_material_hub_counts (fiber, category, card_count, updated_at)
  SELECT 'all', '', public.catalog_list_count('us', 'us', NULL, NULL, NULL, NULL, 80), now();

  FOR rec IN
    SELECT unnest(ARRAY['silk', 'linen', 'cotton', 'wool', 'cashmere']) AS fiber
  LOOP
    INSERT INTO public.catalog_material_hub_counts (fiber, category, card_count, updated_at)
    VALUES (rec.fiber, '', public.catalog_list_count('us', 'us', rec.fiber, NULL, NULL, NULL, 80), now());

    INSERT INTO public.catalog_material_hub_counts (fiber, category, card_count, updated_at)
    VALUES (rec.fiber, 'dresses', public.catalog_list_count('us', 'us', rec.fiber, 'dresses', NULL, NULL, 80), now());
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- catalog_classification_summary (API-visible)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.catalog_classification_summary AS
SELECT
  (SELECT count(*)::bigint FROM public.live_products_apparel) AS live_apparel_offers,
  (SELECT count(*)::bigint FROM public.product_offer_classification) AS classified_offers,
  (SELECT count(*)::bigint FROM public.product_offer_classification WHERE completeness_status = 'complete') AS complete_offers,
  (SELECT count(*)::bigint FROM public.product_offer_classification WHERE completeness_status = 'needs_review') AS needs_review_offers,
  (SELECT count(*)::bigint FROM public.canonical_products) AS canonical_products,
  (SELECT count(*)::bigint FROM public.product_offer_classification WHERE completeness_status = 'complete') AS visible_catalog_cards_approx;

GRANT SELECT ON public.catalog_classification_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.catalog_material_hub_counts TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_list(text, text, text, text, text, text, int, int, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_list_count(text, text, text, text, text, text, int) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.catalog_refresh_material_hub_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_fiber_filter_pass(text, text, text, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.catalog_list IS
  'Fast paginated catalog: uses product_offer_classification indexes, not live view scan.';

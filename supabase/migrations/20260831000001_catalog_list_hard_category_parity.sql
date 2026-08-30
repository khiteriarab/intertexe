-- Align catalog_list / catalog_list_count with shop grid hard gates.
-- Fixes inflated counts when garment_type buckets are broader than keyword filters
-- (e.g. blouses: 114 garment_type tops_blouses vs 4 keyword-matched blouses).

CREATE OR REPLACE FUNCTION public.catalog_shop_category_matches_row(
  p_category text,
  p_garment_type text,
  p_product_category text,
  p_name text,
  p_composition text DEFAULT NULL,
  p_fabric_construction text DEFAULT NULL,
  p_material_subtype text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  c text := lower(trim(replace(coalesce(p_category, ''), '-', '_')));
  gt text := lower(trim(coalesce(p_garment_type, '')));
  cat text := lower(trim(coalesce(p_product_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
  comp text := lower(trim(coalesce(p_composition, '')));
  fab text := lower(trim(coalesce(p_fabric_construction, '')));
  sub text := lower(trim(coalesce(p_material_subtype, '')));
BEGIN
  IF c IN ('', 'all', 'apparel', 'clothing') THEN
    RETURN true;
  END IF;

  IF c = 'jeans' THEN
    IF nam ~ '\y(linen|terry|chino|cargo|jogger|legging|culotte|palazzo|slack|sweatpant|track\s*pant|fleece|lounge)\y' THEN
      RETURN false;
    END IF;
    IF nam ~ '\y(trouser|sweat\s*pant|sweatpant|track\s*pant|lounge\s*pant)\y' THEN
      RETURN false;
    END IF;
    IF nam ~ '\ypants\y' AND nam !~ '\y(jeans?|denim)\y' AND comp !~ '\ydenim\y' THEN
      RETURN false;
    END IF;
    RETURN nam ~ '\y(jeans?|denim)\y'
      OR fab = 'denim'
      OR sub LIKE '%denim%'
      OR comp ~ '\ydenim\y';
  END IF;

  IF c = 'lingerie' THEN
    IF gt = 'lingerie' THEN RETURN true; END IF;
    IF cat ~ '\y(lingerie|underwear|intimates?|bras?|panties|panty|thong|knickers?|briefs?)\y' THEN RETURN true; END IF;
    IF nam ~ '\y(lingerie|underwear|bralette|brassiere|thong|brief|briefs|panty|panties|knicker|knickers|corset|cheeky|hipster|boyshort|babydoll|bodysuit|teddy|g[\s-]?string|v[\s-]?string|balconette|underwire|bra|tanga|plunge|demi|wireless|unlined|longline|high[\s-]?waist|soft[\s-]?cup)\y' THEN
      RETURN true;
    END IF;
    IF nam ~ '\ybikini\b' AND (
      cat ~ '\y(lingerie|underwear|intimate)\y'
      OR (cat = 'swimwear' AND nam !~ '\y(swim|beach|resort|pool)\y')
    ) THEN
      RETURN true;
    END IF;
    IF nam ~ '\y(denim[\s-]?skirt|midi[\s-]?skirt|maxi[\s-]?skirt|mini[\s-]?skirt)\y' THEN RETURN false; END IF;
    IF nam ~ '\y(slip[\s-]?skirt|half[\s-]?slip|petticoat|underskirt|\bslip\b)\y' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF c = 'jumpsuits' THEN
    RETURN nam ~ '\y(jumpsuit|romper|playsuit|overall|boilersuit)\y'
      OR cat ~ '\y(jumpsuit|romper|playsuit|overall|boilersuit)\y';
  END IF;

  IF c = 'sleepwear' THEN
    RETURN nam ~ '\y(pajama|pyjama|nightgown|nightdress|sleepshirt|sleep shirt|sleep set|nightwear|nightshirt|loungewear)\y'
      OR cat ~ '\y(sleepwear|pajama|pyjama|nightwear)\y';
  END IF;

  -- Keyword-hard subcategories — parity with web applyCategoryFilter (no garment_type OR broadening).
  IF c = 'blouses' THEN
    RETURN nam ~ '\yblouse\y' OR cat ~ '\yblouse\y';
  END IF;

  IF c = 'shirts' THEN
    IF nam ~ '\y(blouse|t-shirt|tee|pajama|pyjama)\y' THEN RETURN false; END IF;
    RETURN nam ~ '\yshirt\y' OR cat ~ '\yshirt\y';
  END IF;

  IF c IN ('tanks', 't_shirts', 'tshirts') THEN
    RETURN nam ~ '\y(tank|camisole|cami)\y' OR cat ~ '\y(tank|camisole|cami)\y';
  END IF;

  IF c = 'shorts' THEN
    RETURN nam ~ '\yshort\y' OR cat ~ '\yshort\y';
  END IF;

  IF c = 'coats' THEN
    RETURN nam ~ '\y(coat|trench|parka|overcoat)\y' OR cat ~ '\y(coat|trench|parka|overcoat)\y';
  END IF;

  IF c = 'jackets' THEN
    RETURN nam ~ '\y(jacket|blazer)\y' OR cat ~ '\y(jacket|blazer)\y';
  END IF;

  IF c IN ('matching_sets', 'matching-sets') THEN
    RETURN nam ~ '\y(matching set|co-ord|coord|two piece|two-piece)\y'
      OR cat ~ '\y(matching set|co-ord|coord)\y';
  END IF;

  IF c = 'trousers' OR c = 'bottoms' OR c = 'pants' THEN
    RETURN gt = 'pants_trousers'
      AND (nam ~ '\y(pant|trouser|slack|chino|culotte|cargo|jogger)\y' OR cat ~ '\y(pant|trouser)\y');
  END IF;

  RETURN gt = ANY (coalesce(public.catalog_shop_category_garment_types(c), ARRAY[]::text[]));
END;
$$;

-- Replace bodies (DROP required when Postgres sees a return-type mismatch on OR REPLACE).
DROP FUNCTION IF EXISTS public.catalog_list(text, text, text, text, text, text, int, int, int);
DROP FUNCTION IF EXISTS public.catalog_list_count(text, text, text, text, text, text, int);

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
  cat_key text := lower(replace(btrim(coalesce(p_category, '')), '-', '_'));
BEGIN
  SET LOCAL statement_timeout = '12s';

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
        cat_key = '' OR cat_key IN ('all', 'apparel', 'clothing')
        OR public.catalog_shop_category_matches_row(
          cat_key,
          c.garment_type,
          p.category,
          p.name,
          p.composition,
          p.fabric_construction,
          p.material_subtype
        )
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
  cat_key text := lower(replace(btrim(coalesce(p_category, '')), '-', '_'));
  cnt bigint;
BEGIN
  SET LOCAL statement_timeout = '12s';

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
    AND (
      cat_key = '' OR cat_key IN ('all', 'apparel', 'clothing')
      OR public.catalog_shop_category_matches_row(
        cat_key,
        c.garment_type,
        p.category,
        p.name,
        p.composition,
        p.fabric_construction,
        p.material_subtype
      )
    )
    AND (
      p_search IS NULL OR btrim(p_search) = ''
      OR p.name ILIKE '%' || btrim(p_search) || '%'
      OR p.brand_name ILIKE '%' || btrim(p_search) || '%'
      OR p.composition ILIKE '%' || btrim(p_search) || '%'
    );

  RETURN coalesce(cnt, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_shop_category_matches_row(text, text, text, text, text, text, text)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_list(text, text, text, text, text, text, int, int, int)
  TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.catalog_list_count(text, text, text, text, text, text, int)
  TO service_role, authenticated, anon;

NOTIFY pgrst, 'reload schema';

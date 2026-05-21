-- =============================================================================
-- Consumer catalog scope (non-destructive)
-- - Does NOT delete products rows
-- - Does NOT change approved, composition, tags, collection_slugs
-- - Replaces consumer VIEWS: live_products, live_products_apparel
-- Apply in Supabase SQL Editor, then run verify_consumer_scope.sql
-- Refresh homepage cache per-rail (manual) when Disk IO allows
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Exclusion reason (NULL = eligible for consumer apparel surfaces)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_product_url_valid(p_url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_url IS NOT NULL AND trim(p_url) <> '' AND p_url ~* '^https?://';
$$;

CREATE OR REPLACE FUNCTION public.catalog_is_womens_apparel_category(
  p_category text,
  p_name text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := lower(trim(coalesce(p_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
  tok text;
  approved_tokens text[] := ARRAY[
    'dress', 'gown', 'shirt', 'blouse', 'top', 'tank', 'turtleneck', 'bodysuit',
    'knitwear', 'knit', 'sweater', 'jumper', 'cardigan', 'pullover', 'vest',
    'trouser', 'pants', 'pant', 'skirt', 'shorts', 'jean', 'denim',
    'blazer', 'jacket', 'coat', 'outerwear', 'suit',
    'bottom', 'swimwear', 'lingerie', 'loungewear', 'sleepwear', 'robe', 'nightgown',
    'legging', 'jogger', 'overall', 'jumpsuit', 'romper',
    'parka', 'anorak', 'windbreaker', 'bomber', 'trench', 'poncho', 'cape',
    'kaftan', 'sarong', 'wrap', 'kimono', 'apparel', 'clothing'
  ];
  rejected_tokens text[] := ARRAY[
    'shoe', 'footwear', 'sandal', 'boot', 'sneaker', 'heel', 'pump', 'loafer', 'mule', 'flat',
    'bag', 'handbag', 'tote', 'clutch', 'purse', 'backpack', 'wallet',
    'jewelry', 'jewellery', 'earring', 'necklace', 'bracelet', 'brooch',
    'watch', 'watches',
    'accessory', 'accessories', 'belt', 'scarf', 'glove', 'sunglass', 'eyewear', 'glass',
    'cosmetic', 'beauty', 'fragrance', 'perfume', 'home', 'decor', 'furniture', 'candle',
    'kid', 'kids', 'child', 'children', 'infant', 'baby'
  ];
BEGIN
  IF cat = '' THEN
    RETURN false;
  END IF;

  FOREACH tok IN ARRAY rejected_tokens LOOP
    IF cat LIKE '%' || tok || '%' OR nam LIKE '%' || tok || '%' THEN
      RETURN false;
    END IF;
  END LOOP;

  IF cat LIKE '%men%' OR cat LIKE '%mens%' OR nam LIKE '% for men%' OR nam LIKE '% mens %' THEN
    IF cat NOT LIKE '%women%' AND cat NOT LIKE '%woman%' AND nam NOT LIKE '%women%' AND nam NOT LIKE '%woman%' THEN
      RETURN false;
    END IF;
  END IF;

  FOREACH tok IN ARRAY approved_tokens LOOP
    IF cat LIKE '%' || tok || '%' THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

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
  IF cat ~ '(kid|kids|child|children|girl|boy|baby|infant)' THEN
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

COMMENT ON FUNCTION public.catalog_consumer_exclusion_reason IS
  'Why a row is hidden from consumer surfaces. NULL = passes scope gate (still needs approved/active).';

-- -----------------------------------------------------------------------------
-- 2) Optional audit column (never written by feed; for future batch labeling only)
-- -----------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS display_excluded_reason text,
  ADD COLUMN IF NOT EXISTS catalog_scope text;

COMMENT ON COLUMN public.products.display_excluded_reason IS
  'Optional cache; consumer truth is VIEW + catalog_consumer_exclusion_reason(). Not updated by feed upsert.';

COMMENT ON COLUMN public.products.catalog_scope IS
  'Optional cache: raw | excluded | consumer_apparel. Filled only by approved offline jobs.';

-- -----------------------------------------------------------------------------
-- 3) Consumer views (source of truth for web/iOS/RPC/refresh)
-- Postgres cannot CREATE OR REPLACE when column names/order change — drop first.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.products_catalog_scope CASCADE;
DROP VIEW IF EXISTS public.live_products_apparel CASCADE;
DROP VIEW IF EXISTS public.live_products CASCADE;

CREATE VIEW public.live_products AS
SELECT p.*
FROM public.products AS p
WHERE p.approved = 'yes'
  AND coalesce(p.is_active, true) IS TRUE
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NULL;

COMMENT ON VIEW public.live_products IS
  'Approved active consumer-eligible products (quality + category scope). Not apparel-only.';

CREATE VIEW public.live_products_apparel AS
SELECT p.*
FROM public.products AS p
WHERE p.approved = 'yes'
  AND coalesce(p.is_active, true) IS TRUE
  AND coalesce(p.natural_fiber_percent, 0) >= 80
  AND public.homepage_price_listed(p.price, p.image_url)
  AND public.catalog_product_url_valid(p.url)
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NULL
  AND public.catalog_is_womens_apparel_category(p.category, p.name);

COMMENT ON VIEW public.live_products_apparel IS
  'Women''s apparel consumer surface: approved, active, quality, nfp>=80, in scope.';

-- Audit helper (read-only)
CREATE VIEW public.products_catalog_scope AS
SELECT
  p.id,
  p.product_id,
  p.approved,
  p.is_active,
  p.region,
  p.brand_slug,
  p.category,
  p.natural_fiber_percent,
  public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) AS display_excluded_reason,
  CASE
    WHEN p.approved IS DISTINCT FROM 'yes' OR coalesce(p.is_active, true) IS FALSE THEN 'raw'
    WHEN public.catalog_consumer_exclusion_reason(
      p.category, p.name, p.composition, p.image_url, p.price, p.url
    ) IS NOT NULL THEN 'excluded'
    WHEN EXISTS (SELECT 1 FROM public.live_products_apparel l WHERE l.id = p.id) THEN 'consumer_apparel'
    WHEN EXISTS (SELECT 1 FROM public.live_products l WHERE l.id = p.id) THEN 'consumer_other'
    ELSE 'excluded'
  END AS catalog_scope
FROM public.products AS p;

GRANT SELECT ON public.live_products TO anon, authenticated, service_role;
GRANT SELECT ON public.live_products_apparel TO anon, authenticated, service_role;
GRANT SELECT ON public.products_catalog_scope TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- ROLLBACK (manual)
-- -----------------------------------------------------------------------------
-- Restore prior view definitions from 20240008 / 20240006 backups before applying this file.
-- ALTER TABLE public.products DROP COLUMN IF EXISTS display_excluded_reason;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS catalog_scope;

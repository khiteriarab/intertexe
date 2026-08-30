-- Hard category gates for jeans, lingerie, and related PLPs.
-- Mirrors iOS JeansCategoryCatalog / LingerieCategoryCatalog and web productMatchesHardCategory.

CREATE OR REPLACE FUNCTION public.catalog_shop_category_garment_types(p_category text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  c text := lower(trim(coalesce(p_category, '')));
BEGIN
  IF c = '' OR c = 'all' THEN RETURN NULL; END IF;
  c := replace(c, '-', '_');
  CASE c
    WHEN 'apparel', 'clothing' THEN RETURN NULL;
    WHEN 'dresses' THEN RETURN ARRAY['dresses']::text[];
    WHEN 'tops', 'tops_blouses', 'shirts', 't_shirts', 'tshirts' THEN
      RETURN ARRAY[
        'tops_blouses', 'shirts', 't_shirts', 'tanks', 'camisoles',
        'bodysuits', 'crop_tops', 'knit_tops'
      ]::text[];
    WHEN 'knitwear' THEN RETURN ARRAY['knitwear', 'sweaters_cardigans']::text[];
    WHEN 'jeans', 'jean', 'denim' THEN RETURN ARRAY['pants_trousers']::text[];
    WHEN 'bottoms', 'trousers', 'pants' THEN RETURN ARRAY['pants_trousers']::text[];
    WHEN 'shorts' THEN RETURN ARRAY['shorts']::text[];
    WHEN 'outerwear' THEN RETURN ARRAY['coats', 'jackets_blazers']::text[];
    WHEN 'skirts' THEN RETURN ARRAY['skirts']::text[];
    WHEN 'swimwear' THEN RETURN ARRAY['swim_resortwear']::text[];
    WHEN 'jumpsuits' THEN RETURN ARRAY['jumpsuits']::text[];
    WHEN 'lingerie' THEN RETURN ARRAY['lingerie']::text[];
    WHEN 'sleepwear' THEN RETURN ARRAY['sleepwear']::text[];
    WHEN 'matching_sets' THEN RETURN ARRAY['matching_sets']::text[];
    WHEN 'shoes' THEN RETURN ARRAY['shoes']::text[];
    WHEN 'bags' THEN RETURN ARRAY['bags', 'handbags']::text[];
    ELSE
      RETURN CASE
        WHEN public.catalog_normalize_garment_token(c) IS NULL THEN ARRAY[]::text[]
        ELSE ARRAY[public.catalog_normalize_garment_token(c)]::text[]
      END;
  END CASE;
END;
$$;

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

  IF c = 'trousers' OR c = 'bottoms' OR c = 'pants' THEN
    RETURN gt = 'pants_trousers'
      AND (nam ~ '\y(pant|trouser|slack|chino|culotte|cargo|jogger)\y' OR cat ~ '\y(pant|trouser)\y');
  END IF;

  RETURN gt = ANY (coalesce(public.catalog_shop_category_garment_types(c), ARRAY[]::text[]));
END;
$$;

-- Patch sale_catalog_list: garment bucket + hard category AND
DROP FUNCTION IF EXISTS public.sale_catalog_list(text, text, text, numeric, int, int, text, text, text, text);

CREATE OR REPLACE FUNCTION public.sale_catalog_list(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit int DEFAULT 48,
  p_offset int DEFAULT 0,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_sort text DEFAULT NULL
)
RETURNS SETOF public.live_products_apparel
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref text := lower(coalesce(nullif(trim(p_preferred_region), ''), 'us'));
  fall text := lower(coalesce(nullif(trim(p_fallback_region), ''), pref));
  cat_key text := lower(btrim(coalesce(p_category, '')));
  gtypes text[] := CASE
    WHEN cat_key = '' OR cat_key IN ('all','apparel','clothing') THEN NULL
    ELSE public.catalog_shop_category_garment_types(p_category)
  END;
  sort_key text := lower(btrim(coalesce(p_sort, 'discount')));
  order_ids text;
  order_live text;
BEGIN
  IF sort_key IN ('price-low', 'price_asc', 'price-low-high', 'pricelowhigh') THEN
    order_ids := 'p.price_numeric ASC NULLS LAST, p.id DESC';
    order_live := 'public.catalog_product_price_numeric(l.price::text) ASC NULLS LAST, l.id DESC';
  ELSIF sort_key IN ('price-high', 'price_desc', 'price-high-low', 'pricehighlow') THEN
    order_ids := 'p.price_numeric DESC NULLS LAST, p.id DESC';
    order_live := 'public.catalog_product_price_numeric(l.price::text) DESC NULLS LAST, l.id DESC';
  ELSIF sort_key IN ('new', 'newest', 'new_in') THEN
    order_ids := 'p.created_at DESC NULLS LAST, p.id DESC';
    order_live := 'l.created_at DESC NULLS LAST, l.id DESC';
  ELSIF sort_key IN ('natural', 'natural-high', 'natural_high', 'most_natural') THEN
    order_ids := 'p.natural_fiber_percent DESC NULLS LAST, p.created_at DESC NULLS LAST, p.id DESC';
    order_live := 'l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST, l.id DESC';
  ELSE
    order_ids := $o$
      CASE
        WHEN public.catalog_product_price_numeric(p.original_price::text)
           > coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text))
         AND coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text)) > 0
        THEN (
          public.catalog_product_price_numeric(p.original_price::text)
          - coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text))
        ) / NULLIF(public.catalog_product_price_numeric(p.original_price::text), 0)
        ELSE 0
      END DESC NULLS LAST,
      p.created_at DESC NULLS LAST,
      p.id DESC
    $o$;
    order_live := $o$
      CASE
        WHEN public.catalog_product_price_numeric(l.original_price::text)
           > public.catalog_product_price_numeric(l.price::text)
         AND public.catalog_product_price_numeric(l.price::text) > 0
        THEN (
          public.catalog_product_price_numeric(l.original_price::text)
          - public.catalog_product_price_numeric(l.price::text)
        ) / NULLIF(public.catalog_product_price_numeric(l.original_price::text), 0)
        ELSE 0
      END DESC NULLS LAST,
      l.created_at DESC NULLS LAST,
      l.id DESC
    $o$;
  END IF;

  RETURN QUERY EXECUTE format(
    $sql$
      SELECT l.*
      FROM (
        SELECT p.id
        FROM public.products p
        WHERE p.is_displayable IS TRUE
          AND p.is_sale IS TRUE
          AND coalesce(p.natural_fiber_percent, 0) >= 80
          AND lower(coalesce(p.region, '')) IN (%L, %L)
          AND ($1 IS NULL OR p.garment_type = ANY ($1))
          AND (
            $6 IS NULL OR btrim($6) = '' OR lower(btrim($6)) IN ('all','apparel','clothing')
            OR public.catalog_shop_category_matches_row(
              lower(btrim($6)),
              p.garment_type,
              p.category,
              p.name,
              p.composition,
              p.fabric_construction,
              p.material_subtype
            )
          )
          AND (
            $2 IS NULL OR btrim($2) = ''
            OR lower(coalesce(p.brand_slug, '')) = lower(btrim($2))
          )
          AND (
            $3 IS NULL OR btrim($3) = ''
            OR lower(coalesce(p.color, '')) = lower(btrim($3))
          )
          AND (
            $4 IS NULL
            OR coalesce(p.price_numeric, public.catalog_product_price_numeric(p.price::text)) <= $4
          )
          AND (
            $5 IS NULL OR btrim($5) IN ('', 'all')
            OR lower(coalesce(p.composition,'')) LIKE '%%' || lower(btrim($5)) || '%%'
          )
          AND p.price_numeric IS NOT NULL
          AND p.price_numeric > 0
        ORDER BY %s
        LIMIT %s
        OFFSET %s
      ) ids
      JOIN public.live_products_apparel l ON l.id = ids.id
      ORDER BY %s
    $sql$,
    pref,
    fall,
    order_ids,
    greatest(1, least(coalesce(p_limit, 48), 500)),
    greatest(coalesce(p_offset, 0), 0),
    order_live
  )
  USING gtypes, p_brand_slug, p_color, p_max_price, p_fiber, p_category;
END;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_shop_category_matches_row(text, text, text, text, text, text, text)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.sale_catalog_list(text, text, text, numeric, int, int, text, text, text, text)
  TO anon, authenticated, service_role;

UPDATE public.catalog_taxonomy_nodes
SET is_active = true,
    is_provisional = false,
    min_count_threshold = 0
WHERE slug = 'clothing/lingerie';

NOTIFY pgrst, 'reload schema';

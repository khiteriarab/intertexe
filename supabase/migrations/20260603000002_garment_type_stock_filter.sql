-- garment_type on products + backfill; exclude out_of_stock from live_products_apparel

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS garment_type text;

CREATE INDEX IF NOT EXISTS idx_products_garment_type
  ON public.products(garment_type)
  WHERE garment_type IS NOT NULL;

-- Pattern backfill (specific patterns first)
UPDATE public.products SET garment_type = 'dresses'
WHERE garment_type IS NULL
AND (
  name ILIKE '%dress%' OR name ILIKE '% gown%' OR
  name ILIKE '%midi%' OR name ILIKE '%maxi dress%' OR
  name ILIKE '%mini dress%' OR category ILIKE '%dress%'
);

UPDATE public.products SET garment_type = 'skirts'
WHERE garment_type IS NULL
AND (name ILIKE '%skirt%' OR category ILIKE '%skirt%');

UPDATE public.products SET garment_type = 'tops_blouses'
WHERE garment_type IS NULL
AND (
  name ILIKE '% top%' OR name ILIKE '%blouse%' OR
  name ILIKE '%shirt%' OR name ILIKE '% tee%' OR
  name ILIKE '%tank%' OR name ILIKE '%camisole%' OR
  name ILIKE '%bodysuit%' OR category ILIKE '%top%' OR
  category ILIKE '%blouse%' OR category ILIKE '%shirt%'
);

UPDATE public.products SET garment_type = 'knitwear'
WHERE garment_type IS NULL
AND (
  name ILIKE '%knit%' OR name ILIKE '%sweater%' OR
  name ILIKE '%pullover%' OR name ILIKE '%cardigan%' OR
  name ILIKE '%jumper%' OR name ILIKE '%turtleneck%' OR
  category ILIKE '%knit%' OR category ILIKE '%sweater%'
);

UPDATE public.products SET garment_type = 'sweaters_cardigans'
WHERE garment_type IS NULL
AND (
  name ILIKE '%cardigan%' OR name ILIKE '%pullover%' OR
  category ILIKE '%cardigan%' OR category ILIKE '%sweater%'
);

UPDATE public.products SET garment_type = 'pants_trousers'
WHERE garment_type IS NULL
AND (
  name ILIKE '%trouser%' OR name ILIKE '% pant%' OR
  name ILIKE '%jean%' OR name ILIKE '%legging%' OR
  name ILIKE '%culotte%' OR category ILIKE '%trouser%' OR
  category ILIKE '%pant%' OR category ILIKE '%jean%'
);

UPDATE public.products SET garment_type = 'shorts'
WHERE garment_type IS NULL
AND (name ILIKE '%short%' OR category ILIKE '%short%');

UPDATE public.products SET garment_type = 'jackets_blazers'
WHERE garment_type IS NULL
AND (
  name ILIKE '%jacket%' OR name ILIKE '%blazer%' OR
  category ILIKE '%jacket%' OR category ILIKE '%blazer%'
);

UPDATE public.products SET garment_type = 'coats'
WHERE garment_type IS NULL
AND (
  name ILIKE '% coat%' OR name ILIKE '%trench%' OR name ILIKE '%parka%' OR
  category ILIKE '%coat%' OR category ILIKE '%outerwear%'
);

UPDATE public.products SET garment_type = 'jumpsuits'
WHERE garment_type IS NULL
AND (
  name ILIKE '%jumpsuit%' OR name ILIKE '%playsuit%' OR
  name ILIKE '%romper%' OR name ILIKE '%overall%' OR
  category ILIKE '%jumpsuit%' OR category ILIKE '%playsuit%'
);

UPDATE public.products SET garment_type = 'swim_resortwear'
WHERE garment_type IS NULL
AND (
  name ILIKE '%swim%' OR name ILIKE '%bikini%' OR
  name ILIKE '%swimsuit%' OR name ILIKE '%bathing%' OR
  category ILIKE '%swim%' OR category ILIKE '%bikini%'
);

-- Remaining: catalog classifier
UPDATE public.products
SET garment_type = public.catalog_classify_garment(category, name)
WHERE garment_type IS NULL
  AND public.catalog_classify_garment(category, name) IS NOT NULL
  AND public.catalog_classify_garment(category, name) <> 'needs_review';

-- Recreate live_products_apparel (dynamic columns + stock guard)
DO $$
DECLARE
  col_list text;
  nfp_expr text := 'public.catalog_derived_natural_fiber_percent(p.composition, p.material_metadata, p.natural_fiber_percent::integer)::integer';
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
      AND p.image_url IS NOT NULL
      AND trim(coalesce(p.image_url, '')) <> ''
      AND coalesce(p.is_displayable, true) IS TRUE
      AND (p.stock_status IS NULL OR p.stock_status <> 'out_of_stock')
      AND coalesce(p.gender_scope, '') NOT IN ('men', 'male', 'mens', 'boys')
      AND coalesce(p.brand_slug, '') NOT IN (
        'brunello-cucinelli', 'orlebar-brown', 'orlebarbrown', 'canali', 'hackett', 'tom-ford-men'
      )
      AND NOT (
        lower(coalesce(p.brand_slug, '')) = 'the-attico'
        AND lower(coalesce(p.name, '')) LIKE '%%polo%%'
        AND lower(coalesce(p.name, '')) NOT LIKE '%%women%%'
      )
      AND public.homepage_price_listed(p.price, p.image_url)
      AND public.catalog_product_url_valid(p.url)
      AND public.catalog_consumer_exclusion_reason(
        p.category, p.name, p.composition, p.image_url, p.price, p.url
      ) IS NULL
      AND public.catalog_is_womens_apparel_category(p.category, p.name)
      AND p.name NOT ILIKE '%%sheet%%'
      AND p.name NOT ILIKE '%%pillowcase%%'
      AND p.name NOT ILIKE '%%duvet%%'
      AND p.name NOT ILIKE '%%bedding%%'
      AND p.name NOT ILIKE '%%towel%%'
      AND p.name NOT ILIKE '%%blanket%%'
      AND (p.category IS NULL OR p.category NOT ILIKE '%%bedding%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%sheet%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%pillow%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%duvet%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%towel%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%blanket%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%curtain%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%rug%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%home%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%kitchen%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%bath%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%pet%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%baby%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%toy%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%jewelry%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%watch%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%belt%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%hat%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%glove%%')
      AND (p.category IS NULL OR p.category NOT ILIKE '%%sock%%')
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

GRANT SELECT ON public.live_products_apparel TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- P0: Clothing → Jumpsuits must never return Footwear.
-- Root cause: jumpsuits mapped to garment_type=other_apparel, which is flooded
-- with misclassified Footwear (category='Footwear').

-- 1) Reclassify Footwear that was dumped into other_apparel.
UPDATE public.products
SET garment_type = 'shoes',
    updated_at = now()
WHERE garment_type = 'other_apparel'
  AND (
    lower(coalesce(category, '')) LIKE '%footwear%'
    OR lower(coalesce(category, '')) LIKE '%shoe%'
    OR lower(coalesce(name, '') || ' ' || coalesce(category, ''))
         ~ '(^|[^a-z])(shoe|shoes|sandal|sandals|boot|boots|bootie|sneaker|sneakers|loafer|loafers|mule|mules|heel|heels|pump|pumps|espadrille|trainer|trainers|slide|slides)([^a-z]|$)'
  );

-- 2) Promote real jumpsuit/romper listings onto a dedicated garment token.
UPDATE public.products
SET garment_type = 'jumpsuits',
    updated_at = now()
WHERE is_displayable IS TRUE
  AND coalesce(garment_type, '') <> 'jumpsuits'
  AND lower(coalesce(name, '') || ' ' || coalesce(category, ''))
      ~ '(jumpsuit|romper|playsuit|boilersuit|cat.?suit)'
  AND lower(coalesce(category, '')) NOT LIKE '%footwear%'
  AND lower(coalesce(name, '') || ' ' || coalesce(category, ''))
      !~ '(^|[^a-z])(shoe|shoes|sandal|boot|sneaker|loafer|heel|pump)([^a-z]|$)';

-- 3) Map shop slug jumpsuits → jumpsuits only (never bare other_apparel).
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
    WHEN 'bottoms', 'trousers', 'pants' THEN RETURN ARRAY['pants_trousers', 'shorts']::text[];
    WHEN 'outerwear' THEN RETURN ARRAY['coats', 'jackets_blazers']::text[];
    WHEN 'skirts' THEN RETURN ARRAY['skirts']::text[];
    WHEN 'swimwear' THEN RETURN ARRAY['swim_resortwear']::text[];
    -- Hard category: jumpsuits are NOT the other_apparel catch-all.
    WHEN 'jumpsuits' THEN RETURN ARRAY['jumpsuits']::text[];
    WHEN 'lingerie' THEN RETURN ARRAY['lingerie']::text[];
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

COMMENT ON FUNCTION public.catalog_shop_category_garment_types(text) IS
  'Shop category → garment_type tokens. jumpsuits is hard AND (jumpsuits only), never other_apparel.';

NOTIFY pgrst, 'reload schema';

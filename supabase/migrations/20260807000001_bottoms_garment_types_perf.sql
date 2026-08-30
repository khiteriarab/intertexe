-- Bottoms/trousers: pants_trousers only (dual pants+shorts timed out ~60s).
-- Keep jumpsuits → jumpsuits (never other_apparel).
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
    WHEN 'bottoms', 'trousers', 'pants' THEN RETURN ARRAY['pants_trousers']::text[];
    WHEN 'shorts' THEN RETURN ARRAY['shorts']::text[];
    WHEN 'outerwear' THEN RETURN ARRAY['coats', 'jackets_blazers']::text[];
    WHEN 'skirts' THEN RETURN ARRAY['skirts']::text[];
    WHEN 'swimwear' THEN RETURN ARRAY['swim_resortwear']::text[];
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

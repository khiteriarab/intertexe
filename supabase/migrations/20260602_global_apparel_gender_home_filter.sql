-- Global women's apparel scope: exclude men's, home/bedding, and non-apparel from all consumer surfaces.
-- Recreates live_products_apparel with gender_scope + home guards; adds is_displayable cache column.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_displayable boolean;

CREATE OR REPLACE FUNCTION public.update_is_displayable()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_displayable = (
    NEW.approved = 'yes'
    AND coalesce(NEW.is_active, true) IS TRUE
    AND coalesce(NEW.natural_fiber_percent, 0) >= 80
    AND NEW.image_url IS NOT NULL
    AND trim(coalesce(NEW.image_url, '')) <> ''
    AND coalesce(NEW.gender_scope, '') NOT IN ('men', 'male', 'mens', 'boys')
    AND coalesce(NEW.name, '') NOT ILIKE '%lubricant%'
    AND coalesce(NEW.name, '') NOT ILIKE '%lube%'
    AND coalesce(NEW.name, '') NOT ILIKE '%supplement%'
    AND coalesce(NEW.name, '') NOT ILIKE '%vitamin%'
    AND coalesce(NEW.name, '') NOT ILIKE '%fragrance%'
    AND coalesce(NEW.name, '') NOT ILIKE '%perfume%'
    AND coalesce(NEW.name, '') NOT ILIKE '%skincare%'
    AND coalesce(NEW.name, '') NOT ILIKE '%serum%'
    AND coalesce(NEW.name, '') NOT ILIKE '%sheet%'
    AND coalesce(NEW.name, '') NOT ILIKE '%pillowcase%'
    AND coalesce(NEW.name, '') NOT ILIKE '%duvet%'
    AND coalesce(NEW.name, '') NOT ILIKE '%bedding%'
    AND coalesce(NEW.name, '') NOT ILIKE '%towel%'
    AND coalesce(NEW.name, '') NOT ILIKE '%blanket%'
    AND coalesce(NEW.category, '') NOT ILIKE '%beauty%'
    AND coalesce(NEW.category, '') NOT ILIKE '%health%'
    AND coalesce(NEW.category, '') NOT ILIKE '%wellness%'
    AND coalesce(NEW.category, '') NOT ILIKE '%bedding%'
    AND coalesce(NEW.category, '') NOT ILIKE '%home%'
    AND coalesce(NEW.category, '') NOT ILIKE '%pet%'
    AND coalesce(NEW.category, '') NOT ILIKE '%sheet%'
    AND coalesce(NEW.category, '') NOT ILIKE '%pillow%'
    AND coalesce(NEW.category, '') NOT ILIKE '%duvet%'
    AND coalesce(NEW.category, '') NOT ILIKE '%towel%'
    AND coalesce(NEW.category, '') NOT ILIKE '%blanket%'
    AND coalesce(NEW.category, '') NOT ILIKE '%curtain%'
    AND coalesce(NEW.category, '') NOT ILIKE '%rug%'
    AND coalesce(NEW.category, '') NOT ILIKE '%kitchen%'
    AND coalesce(NEW.category, '') NOT ILIKE '%bath%'
    AND coalesce(NEW.category, '') NOT ILIKE '%toy%'
    AND coalesce(NEW.category, '') NOT ILIKE '%jewelry%'
    AND coalesce(NEW.category, '') NOT ILIKE '%watch%'
    AND coalesce(NEW.category, '') NOT ILIKE '%belt%'
    AND coalesce(NEW.category, '') NOT ILIKE '%hat%'
    AND coalesce(NEW.category, '') NOT ILIKE '%glove%'
    AND coalesce(NEW.category, '') NOT ILIKE '%sock%'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_is_displayable ON public.products;
CREATE TRIGGER trg_products_is_displayable
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_is_displayable();

-- Expand consumer exclusion gate (used by live views).
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
  IF cat ~ '(beauty|fragrance|perfume|makeup|skincare|cosmetic|health|wellness)' THEN
    RETURN 'beauty_home';
  END IF;
  IF cat ~ '(bedding|sheet|pillow|duvet|towel|blanket|curtain|rug|home|kitchen|bath|pet|toy)'
     OR nam ~ '(bedding|sheet|pillowcase|duvet|towel|blanket)' THEN
    RETURN 'home';
  END IF;

  IF NOT public.catalog_is_womens_apparel_category(p_category, p_name) THEN
    RETURN 'not_womens_apparel';
  END IF;

  RETURN NULL;
END;
$$;

-- Recreate live_products_apparel with gender_scope + home/name guards (preserve derived NFP).
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

-- Exclude faux / vegan / PU leather from the natural-fibers consumer catalog.
-- Fixes misclassification where catalog_fiber_token_to_material matched "leather" inside "vegan leather".

CREATE OR REPLACE FUNCTION public.catalog_is_synthetic_leather_text(p_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  blob text := lower(trim(coalesce(p_text, '')));
BEGIN
  IF blob = '' THEN
    RETURN false;
  END IF;

  IF blob ~ '(vegan\s+leather|faux[\s-]?leather|pu\s+leather|polyurethane\s+leather|pleather|synthetic\s+leather|leatherette|imitation\s+leather|bonded\s+leather|eco[\s-]?leather|vegan\s+suede|faux\s+suede|artificial\s+leather|vinyl\s+leather|pvc\s+leather)' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.catalog_is_synthetic_leather_text IS
  'True for faux/vegan/PU leather tokens in product name or composition text.';

CREATE OR REPLACE FUNCTION public.catalog_fiber_token_to_material(p_fiber text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  f text := lower(trim(coalesce(p_fiber, '')));
BEGIN
  IF f = '' THEN RETURN NULL; END IF;
  IF public.catalog_is_synthetic_leather_text(f) THEN RETURN 'synthetic_blend'; END IF;
  IF f ~ '(silk|mulberry)' THEN RETURN 'silk'; END IF;
  IF f ~ '(cashmere)' THEN RETURN 'cashmere'; END IF;
  IF f ~ '(wool|merino|lambswool|alpaca|mohair|cashmere)' THEN
    IF f ~ '(cashmere)' THEN RETURN 'cashmere'; END IF;
    RETURN 'wool';
  END IF;
  IF f ~ '(linen|flax)' THEN RETURN 'linen'; END IF;
  IF f ~ '(cotton)' THEN RETURN 'cotton'; END IF;
  IF f ~ '(leather|suede)' THEN RETURN 'leather_suede'; END IF;
  IF f ~ '(viscose|rayon|cupro|modal|lyocell|tencel|bamboo)' THEN RETURN 'viscose_rayon'; END IF;
  IF f ~ '(polyester|nylon|acrylic|elastane|spandex|polyamide|polypropylene|polyurethane)' THEN RETURN 'synthetic_blend'; END IF;
  RETURN NULL;
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
  comp text := lower(trim(coalesce(p_composition, '')));
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

  IF public.catalog_is_synthetic_leather_text(nam)
     OR public.catalog_is_synthetic_leather_text(comp) THEN
    RETURN 'synthetic_leather';
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

NOTIFY pgrst, 'reload schema';

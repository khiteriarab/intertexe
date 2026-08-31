-- Broaden matching-sets hard gate: garment_type bucket is empty in production.
-- Match co-ords / two-piece / * set naming used by Reformation, etc.

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
    IF gt = 'matching_sets' THEN RETURN true; END IF;
    RETURN nam ~ '(matching\s*set|co-?ord|two[\s-]?piece|(skirt|dress|top|pant|short|lounge|piece)\s+set)'
      OR cat ~ '(matching\s*set|co-?ord|two[\s-]?piece)';
  END IF;

  IF c = 'trousers' OR c = 'bottoms' OR c = 'pants' THEN
    RETURN gt = 'pants_trousers'
      AND (nam ~ '\y(pant|trouser|slack|chino|culotte|cargo|jogger)\y' OR cat ~ '\y(pant|trouser)\y');
  END IF;

  RETURN gt = ANY (coalesce(public.catalog_shop_category_garment_types(c), ARRAY[]::text[]));
END;
$$;

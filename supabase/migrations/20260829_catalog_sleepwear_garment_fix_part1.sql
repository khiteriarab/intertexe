-- Part 1: classifier + infer functions only (fast).

CREATE OR REPLACE FUNCTION public.catalog_classify_garment(p_category text, p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := lower(trim(coalesce(p_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
BEGIN
  IF cat = '' AND nam = '' THEN RETURN 'needs_review'; END IF;
  IF cat ~ '(dress|gown)' OR nam ~ '(dress|gown)' THEN RETURN 'dresses'; END IF;
  IF cat ~ '(lingerie|underwear|intimate)'
    OR nam ~ '(lingerie|underwear|bralette|thong|brief|panty|knicker|corset)'
    OR nam ~ '(^|[^a-z])bra([^a-z]|$)' THEN
    RETURN 'lingerie';
  END IF;
  IF nam ~ 'bikini' AND (
    cat ~ '(lingerie|underwear|intimate)'
    OR (cat ~ 'swimwear' AND nam !~ 'swim' AND nam !~ 'beach' AND nam !~ 'resort' AND nam !~ 'pool')
  ) THEN
    RETURN 'lingerie';
  END IF;
  IF cat ~ '(sleepwear|nightwear|pyjama|pajama|loungewear)'
    OR nam ~ 'pajama|pyjama|nightgown|nightdress|sleepshirt|sleep shirt|sleep set|nightwear' THEN
    RETURN 'sleepwear';
  END IF;
  IF nam ~ 'robe' AND nam ~ 'dress' THEN NULL;
  ELSIF (cat ~ 'robe' OR nam ~ 'robe') AND (nam ~ 'bath' OR nam ~ 'dressing' OR cat ~ 'sleep' OR cat ~ 'lounge') THEN
    RETURN 'sleepwear';
  END IF;
  IF cat ~ '(blouse|bodysuit|tank|camisole)' OR nam ~ '(blouse|bodysuit)' THEN RETURN 'tops_blouses'; END IF;
  IF cat ~ '(^|[^a-z])top([^a-z]|$)' OR nam ~ '( tank top| camisole)' THEN RETURN 'tops_blouses'; END IF;
  IF cat ~ '(shirt)' AND cat !~ 't-shirt'
    AND nam !~ 'pajama|pyjama|nightgown|nightdress|sleepshirt|sleep shirt|sleep set|nightwear' THEN
    RETURN 'shirts';
  END IF;
  IF cat ~ '(knit)' AND cat !~ '(sweater|cardigan)' THEN RETURN 'knitwear'; END IF;
  IF cat ~ '(sweater|cardigan|pullover|jumper)' THEN RETURN 'sweaters_cardigans'; END IF;
  IF cat ~ '(pant|trouser|jean|denim)' THEN RETURN 'pants_trousers'; END IF;
  IF cat ~ '(skirt)' THEN RETURN 'skirts'; END IF;
  IF cat ~ '(short)' THEN RETURN 'shorts'; END IF;
  IF cat ~ '(blazer|jacket)' THEN RETURN 'jackets_blazers'; END IF;
  IF cat ~ '(coat|outerwear|parka|trench|anorak)' THEN RETURN 'coats'; END IF;
  IF cat ~ '(swim|bikini|resort)' OR nam ~ 'swimwear|swimsuit|one-piece swim' THEN RETURN 'swim_resortwear'; END IF;
  IF cat ~ '(scarf|wrap|shawl)' OR nam ~ '(scarf|wrap|shawl)' THEN RETURN 'scarves_wraps'; END IF;
  IF cat ~ '(set|co-ord|coord|two piece|two-piece)' THEN RETURN 'matching_sets'; END IF;
  IF cat = '' THEN RETURN 'needs_review'; END IF;
  RETURN 'other_apparel';
END;
$$;

UPDATE public.catalog_taxonomy_nodes
SET label = 'Sleepwear', updated_at = now()
WHERE slug = 'clothing/sleepwear';

NOTIFY pgrst, 'reload schema';

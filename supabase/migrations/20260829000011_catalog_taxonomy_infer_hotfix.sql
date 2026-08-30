-- Hotfix retail-v1 inference: jeans, blouses, tanks, mary janes, ballet flats
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_infer_apparel(
  p_garment_type text,
  p_category text,
  p_name text
)
RETURNS TABLE (slug text, confidence smallint, source text)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  gt text := public.catalog_taxonomy_norm(p_garment_type);
  cat text := public.catalog_taxonomy_norm(p_category);
  nam text := public.catalog_taxonomy_norm(p_name);
  is_dress boolean := gt = 'dresses' OR cat ~ '(dress|gown)' OR nam ~ '\bdress\b' OR nam ~ '\bgown\b';
  is_skirt boolean := gt = 'skirts' OR cat ~ 'skirt' OR nam ~ '\bskirt\b';
  is_jacket boolean := gt = 'jackets_blazers' OR cat ~ 'jacket' OR cat ~ 'blazer'
    OR nam ~ '\bjacket\b' OR nam ~ '\bblazer\b';
  is_coat boolean := gt = 'coats' OR (cat ~ 'coat' AND NOT is_jacket) OR nam ~ '\bcoat\b';
  is_jean boolean := NOT is_skirt AND NOT is_jacket AND (
    cat ~ 'denim' OR cat ~ 'jean' OR nam ~ 'jean' OR nam ~ 'denim'
  );
  is_trouser boolean := gt = 'pants_trousers' AND NOT is_jean;
  is_tank boolean := NOT is_dress AND (
    cat ~ 'camisole' OR cat ~ 'tank' OR nam ~ 'camisole' OR nam ~ ' tank' OR nam ~ 'cami '
  ) AND nam !~ '\bdress\b';
  is_blouse boolean := NOT is_dress AND NOT is_tank AND (
    cat ~ 'blouse' OR nam ~ 'blouse'
  );
  is_shirt boolean := NOT is_dress AND NOT is_tank AND NOT is_blouse AND (
    gt = 'shirts' OR cat ~ 'shirt' OR nam ~ ' shirt' OR nam ~ '^shirt' OR nam ~ 'shirtdress' = false AND nam ~ 'shirt'
  );
  is_bridal boolean := is_dress AND (nam ~ 'bridal' OR nam ~ 'wedding' OR nam ~ 'bride');
  is_knit boolean := gt IN ('knitwear', 'sweaters_cardigans');
  is_short boolean := gt = 'shorts';
  is_set boolean := gt = 'matching_sets' OR cat ~ 'co-ord' OR cat ~ 'coord' OR cat ~ 'two piece'
    OR cat ~ 'two-piece' OR nam ~ 'matching set' OR nam ~ 'co-ord' OR nam ~ 'two piece';
  is_swim boolean := gt = 'swim_resortwear' OR cat ~ 'swim' OR cat ~ 'bikini' OR nam ~ 'swimwear' OR nam ~ 'bikini';
BEGIN
  IF is_bridal THEN slug := 'clothing/bridal-dresses'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_dress THEN slug := 'clothing/dresses'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jean THEN slug := 'clothing/jeans'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_trouser THEN slug := 'clothing/trousers'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_skirt THEN slug := 'clothing/skirts'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_short THEN slug := 'clothing/shorts'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jacket THEN slug := 'clothing/jackets'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_coat THEN slug := 'clothing/coats'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_knit THEN slug := 'clothing/knitwear'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_set THEN slug := 'clothing/matching-sets'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_swim THEN slug := 'clothing/swimwear'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_tank THEN slug := 'clothing/tanks-and-camisoles'; confidence := 84; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_blouse THEN slug := 'clothing/blouses'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_shirt OR gt = 'shirts' THEN slug := 'clothing/shirts'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF gt = 'tops_blouses' THEN slug := 'clothing/blouses'; confidence := 70; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_infer_footwear(
  p_category text,
  p_name text
)
RETURNS TABLE (slug text, confidence smallint, source text)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := public.catalog_taxonomy_norm(p_category);
  nam text := public.catalog_taxonomy_norm(p_name);
  is_sneaker boolean := nam ~ 'sneaker' OR nam ~ 'trainer' OR nam ~ 'ballet runner' OR nam ~ 'runner 2';
  is_loafer boolean := nam ~ 'loafer' OR nam ~ 'penny';
  is_mary boolean := nam ~ 'mary[\s-]?jane';
  is_ballet boolean := (nam ~ 'ballet flat' OR nam ~ 'ballerina' OR nam ~ 'ballerinas' OR (nam ~ 'ballet' AND nam ~ 'flat'))
    AND NOT is_sneaker;
  is_ankle boolean := nam ~ 'ankle boot' OR nam ~ 'bootie' OR nam ~ 'ankle-boot';
  is_boot boolean := (nam ~ 'boot' OR nam ~ 'bootie') AND NOT is_sneaker AND nam !~ 'bootcut';
  is_pump boolean := nam ~ 'pump' OR nam ~ 'stiletto';
  is_mule boolean := nam ~ 'mule';
  is_sandal boolean := nam ~ 'sandal' OR nam ~ 'slide' OR nam ~ 'flip flop';
  is_heeled_sandal boolean := is_sandal AND (nam ~ 'heeled' OR nam ~ 'heel' OR nam ~ 'wedge' OR nam ~ '[0-9]+ mm');
BEGIN
  IF is_sneaker THEN slug := 'shoes/sneakers'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mary THEN slug := 'shoes/mary-janes'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ballet THEN slug := 'shoes/ballet-flats'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ankle THEN slug := 'shoes/ankle-boots'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_boot THEN slug := 'shoes/boots'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_pump THEN slug := 'shoes/pumps'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_heeled_sandal THEN slug := 'shoes/heeled-sandals'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mule THEN slug := 'shoes/mules'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_loafer THEN slug := 'shoes/loafers'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_sandal THEN slug := 'shoes/sandals'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF cat ~ 'shoe' OR cat ~ 'footwear' OR cat ~ 'sandal' THEN
    slug := 'shoes/sandals'; confidence := 60; source := 'retailer_category'; RETURN NEXT; RETURN;
  END IF;
  RETURN;
END;
$$;

DELETE FROM public.product_taxonomy_assignments WHERE taxonomy_version = 'retail-v1';

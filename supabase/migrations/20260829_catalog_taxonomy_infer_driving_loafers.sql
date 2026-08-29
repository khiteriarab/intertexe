-- Footwear inference: map driving shoes / moccasins (flat slip-ons) to loafers for ambiguity QA.
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
  is_loafer boolean := nam ~ 'loafer' OR nam ~ 'penny' OR nam ~ 'horsebit'
    OR nam ~ 'driving shoe' OR nam ~ 'driving moccasin';
  is_mary boolean := nam ~ 'mary[\s-]?jane';
  is_ballet boolean := (nam ~ 'ballet[\s-]?flat' OR nam ~ 'ballerina' OR nam ~ 'ballerinas' OR (nam ~ 'ballet' AND nam ~ 'flat'))
    AND NOT is_sneaker;
  is_espadrille boolean := nam ~ 'espadrille';
  is_ankle boolean := nam ~ 'ankle boot' OR nam ~ 'bootie' OR nam ~ 'ankle-boot';
  is_boot boolean := (nam ~ 'boot' OR nam ~ 'bootie') AND NOT is_sneaker AND nam !~ 'bootcut';
  is_pump boolean := nam ~ 'pump' OR nam ~ 'stiletto';
  is_mule boolean := nam ~ 'mule';
  is_sandal boolean := nam ~ 'sandal' OR nam ~ 'slide' OR nam ~ 'flip flop';
  is_heeled_sandal boolean := is_sandal AND (nam ~ 'heeled' OR nam ~ 'heel' OR nam ~ 'wedge' OR nam ~ '[0-9]+ mm');
BEGIN
  IF is_sneaker THEN slug := 'shoes/sneakers'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_espadrille THEN slug := 'shoes/espadrilles'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mary THEN slug := 'shoes/mary-janes'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ballet THEN slug := 'shoes/ballet-flats'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ankle THEN slug := 'shoes/ankle-boots'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_boot THEN slug := 'shoes/boots'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_pump THEN slug := 'shoes/pumps'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_heeled_sandal THEN slug := 'shoes/heeled-sandals'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mule THEN slug := 'shoes/mules'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_loafer THEN slug := 'shoes/loafers'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_sandal THEN slug := 'shoes/sandals'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  RETURN;
END;
$$;

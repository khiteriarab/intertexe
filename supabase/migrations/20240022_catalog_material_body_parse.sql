-- =============================================================================
-- Material body/shell parser — excludes trim, embroidery, lining, etc.
-- Replaces naive whole-string fiber matching for rail eligibility.
-- Does NOT modify products.composition (source truth).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Segment role: body (shell/main) vs secondary (trim, embroidery, …)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_composition_segment_is_secondary(p_line text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  ln text := lower(trim(coalesce(p_line, '')));
BEGIN
  IF ln = '' THEN RETURN true; END IF;
  IF ln ~ '(embroidery\s+fabric|embroidery\s*:)' THEN RETURN true; END IF;
  IF ln ~ '^\s*(trim|embroidery|lining|contrast|pocket|rib|button|decoration|appliqu[eé]|applique|label|collar|cuff|placket|overlay|bead|sequin|interlining|underlay|facing|belt\s*loop|elastic\s*trim|gusset|hood\s*lining|pocketing|exclusive\s+of|excluding|excl\.|detail\s*fabric|panel\s*trim|lace\s*trim|neckline|shoulder|sleeve\s*trim|hem\s*trim|yoke\s*trim|trimming)\s*[:]' THEN
    RETURN true;
  END IF;
  IF ln ~ '(^|[^a-z])(trim|embroidery|lining|contrast|pocketing|appliqu[eé]|beadwork|sequin)\s*[:]' THEN
    RETURN true;
  END IF;
  IF ln ~ '(exclusive of trim|excluding trim|exclusive of decoration)' THEN RETURN true; END IF;
  RETURN false;
END;
$$;

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
  IF f ~ '(polyester|nylon|acrylic|elastane|spandex|polyamide|polypropylene)' THEN RETURN 'synthetic_blend'; END IF;
  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- Parse composition → jsonb derived fields
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_parse_composition_material(
  p_composition text,
  p_material_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  comp text := trim(coalesce(p_composition, ''));
  lines text[];
  ln text;
  i int;
  is_secondary boolean;
  is_body boolean;
  body_lines text[] := '{}'::text[];
  secondary_fibers text[] := '{}'::text[];
  notes text[] := '{}'::text[];
  m text[];
  fiber text;
  mat text;
  pct int;
  -- aggregate body fiber weights
  silk_w int := 0; cashmere_w int := 0; wool_w int := 0; linen_w int := 0;
  cotton_w int := 0; leather_w int := 0; viscose_w int := 0; synth_w int := 0;
  total_body_w int := 0;
  primary_material text := 'unknown_material';
  primary_pct int := 0;
  confidence int := 0;
  needs_review boolean := true;
  winner_w int := 0;
BEGIN
  IF comp = '' THEN
    RETURN jsonb_build_object(
      'primary_material', 'unknown_material',
      'primary_material_percent', NULL,
      'secondary_materials', '[]'::jsonb,
      'material_component_notes', 'empty composition',
      'material_classification_confidence', 0,
      'needs_material_review', true
    );
  END IF;

  lines := regexp_split_to_array(
    regexp_replace(comp, E'[\\r\\n]+', E'\n', 'g'),
    E'\\n|;|\\|'
  );

  FOR i IN 1 .. coalesce(array_length(lines, 1), 0) LOOP
    ln := trim(lines[i]);
    IF ln = '' THEN CONTINUE; END IF;

    is_secondary := public.catalog_composition_segment_is_secondary(ln);
    is_body := NOT is_secondary AND (
      ln ~ '^\s*(shell|body|main|outer|self|garment|fabric)\s*[:]'
      OR ln ~ '^\s*\d+\s*%'
      OR (NOT is_secondary AND ln !~ '^\s*(trim|embroidery|lining)\s*')
    );

    IF is_secondary THEN
      notes := notes || ln;
      FOR m IN SELECT regexp_matches(ln, '(\d+)\s*%\s*([a-z][a-z\s-]{2,40})', 'gi') LOOP
        mat := public.catalog_fiber_token_to_material(m[2]);
        IF mat IS NOT NULL AND NOT (mat = ANY (secondary_fibers)) THEN
          secondary_fibers := secondary_fibers || mat;
        END IF;
      END LOOP;
      CONTINUE;
    END IF;

    IF is_body THEN
      body_lines := body_lines || ln;
      FOR m IN SELECT regexp_matches(ln, '(\d+)\s*%\s*([a-z][a-z\s-]{2,40})', 'gi') LOOP
        pct := m[1]::int;
        mat := public.catalog_fiber_token_to_material(m[2]);
        IF mat IS NULL THEN CONTINUE; END IF;
        total_body_w := total_body_w + pct;
        CASE mat
          WHEN 'silk' THEN silk_w := silk_w + pct;
          WHEN 'cashmere' THEN cashmere_w := cashmere_w + pct;
          WHEN 'wool' THEN wool_w := wool_w + pct;
          WHEN 'linen' THEN linen_w := linen_w + pct;
          WHEN 'cotton' THEN cotton_w := cotton_w + pct;
          WHEN 'leather_suede' THEN leather_w := leather_w + pct;
          WHEN 'viscose_rayon' THEN viscose_w := viscose_w + pct;
          WHEN 'synthetic_blend' THEN synth_w := synth_w + pct;
          ELSE NULL;
        END CASE;
      END LOOP;
    END IF;
  END LOOP;

  -- No labeled body lines: treat first non-secondary line as body (common feed format)
  IF array_length(body_lines, 1) IS NULL AND array_length(lines, 1) > 0 THEN
    FOR i IN 1 .. array_length(lines, 1) LOOP
      ln := trim(lines[i]);
      IF ln = '' THEN CONTINUE; END IF;
      IF public.catalog_composition_segment_is_secondary(ln) THEN CONTINUE; END IF;
      body_lines := ARRAY[ln];
      FOR m IN SELECT regexp_matches(ln, '(\d+)\s*%\s*([a-z][a-z\s-]{2,40})', 'gi') LOOP
        pct := m[1]::int;
        mat := public.catalog_fiber_token_to_material(m[2]);
        IF mat IS NULL THEN CONTINUE; END IF;
        total_body_w := total_body_w + pct;
        CASE mat
          WHEN 'silk' THEN silk_w := silk_w + pct;
          WHEN 'cashmere' THEN cashmere_w := cashmere_w + pct;
          WHEN 'wool' THEN wool_w := wool_w + pct;
          WHEN 'linen' THEN linen_w := linen_w + pct;
          WHEN 'cotton' THEN cotton_w := cotton_w + pct;
          WHEN 'leather_suede' THEN leather_w := leather_w + pct;
          WHEN 'viscose_rayon' THEN viscose_w := viscose_w + pct;
          WHEN 'synthetic_blend' THEN synth_w := synth_w + pct;
          ELSE NULL;
        END CASE;
      END LOOP;
      EXIT;
    END LOOP;
  END IF;

  IF total_body_w = 0 OR array_length(body_lines, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'primary_material', 'unknown_material',
      'primary_material_percent', NULL,
      'secondary_materials', to_jsonb(secondary_fibers),
      'material_component_notes', 'no confident body/shell segment',
      'material_classification_confidence', 0,
      'needs_material_review', true
    );
  END IF;

  -- Pick dominant body fiber (priority order on ties: natural fibers before synthetics)
  winner_w := GREATEST(silk_w, cashmere_w, wool_w, linen_w, cotton_w, leather_w, viscose_w, synth_w);
  IF winner_w = silk_w AND silk_w > 0 THEN primary_material := 'silk'; primary_pct := silk_w;
  ELSIF winner_w = cashmere_w AND cashmere_w > 0 THEN primary_material := 'cashmere'; primary_pct := cashmere_w;
  ELSIF winner_w = wool_w AND wool_w > 0 THEN primary_material := 'wool'; primary_pct := wool_w;
  ELSIF winner_w = linen_w AND linen_w > 0 THEN primary_material := 'linen'; primary_pct := linen_w;
  ELSIF winner_w = cotton_w AND cotton_w > 0 THEN primary_material := 'cotton'; primary_pct := cotton_w;
  ELSIF winner_w = leather_w AND leather_w > 0 THEN primary_material := 'leather_suede'; primary_pct := leather_w;
  ELSIF winner_w = viscose_w AND viscose_w > 0 THEN primary_material := 'viscose_rayon'; primary_pct := viscose_w;
  ELSIF winner_w = synth_w AND synth_w > 0 THEN primary_material := 'synthetic_blend'; primary_pct := synth_w;
  END IF;

  -- Normalize primary_pct to share of body weight
  IF total_body_w > 0 AND primary_pct > 0 THEN
    primary_pct := round((primary_pct::numeric / total_body_w::numeric) * 100)::int;
  END IF;

  -- Confidence & review flags
  IF primary_material = 'unknown_material' OR winner_w = 0 THEN
    needs_review := true;
    confidence := 0;
  ELSIF primary_pct >= 80 AND array_length(body_lines, 1) = 1 THEN
    needs_review := false;
    confidence := 90;
  ELSIF primary_pct >= 50 THEN
    needs_review := false;
    confidence := 75;
  ELSIF primary_pct >= 40 THEN
    -- competing body fibers
    IF (CASE WHEN silk_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN cashmere_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN wool_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN linen_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN cotton_w > 0 THEN 1 ELSE 0 END) > 1
       AND primary_pct < 60 THEN
      needs_review := true;
      confidence := 40;
    ELSE
      needs_review := false;
      confidence := 60;
    END IF;
  ELSE
    needs_review := true;
    confidence := 30;
  END IF;

  -- Secondary-only silk etc. must not elevate primary: if body is cotton but silk only in secondary, already excluded from weights
  IF array_length(secondary_fibers, 1) > 0 AND primary_material <> 'unknown_material' THEN
    notes := array_append(notes, 'secondary components excluded from rail eligibility');
  END IF;

  RETURN jsonb_build_object(
    'primary_material', primary_material,
    'primary_material_percent', primary_pct,
    'secondary_materials', to_jsonb(secondary_fibers),
    'material_component_notes', array_to_string(notes, '; '),
    'material_classification_confidence', confidence,
    'needs_material_review', needs_review
  );
END;
$$;

COMMENT ON FUNCTION public.catalog_parse_composition_material IS
  'Derives primary body/shell fiber from composition. Trim/embroidery/lining segments excluded from rails.';

-- -----------------------------------------------------------------------------
-- Wrappers used by classification + rails
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_classify_material(
  p_composition text,
  p_material_metadata jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(
    public.catalog_parse_composition_material(p_composition, p_material_metadata)->>'primary_material',
    'unknown_material'
  );
$$;

CREATE OR REPLACE FUNCTION public.catalog_material_rail_eligible(
  p_composition text,
  p_material_metadata jsonb,
  p_fabric_rail text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  parsed jsonb := public.catalog_parse_composition_material(p_composition, p_material_metadata);
  primary_mat text := parsed->>'primary_material';
  needs_rev boolean := coalesce((parsed->>'needs_material_review')::boolean, true);
BEGIN
  IF needs_rev OR primary_mat IS NULL OR primary_mat = 'unknown_material' THEN
    RETURN false;
  END IF;
  RETURN CASE p_fabric_rail
    WHEN 'silk' THEN primary_mat = 'silk'
    WHEN 'linen' THEN primary_mat = 'linen'
    WHEN 'cashmere' THEN primary_mat = 'cashmere'
    WHEN 'wool' THEN primary_mat = 'wool'
    WHEN 'cotton' THEN primary_mat = 'cotton'
    WHEN 'leather_suede' THEN primary_mat = 'leather_suede'
    ELSE false
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_infer_rail_keys(
  p_material_primary text,
  p_collection_slugs text[],
  p_is_sale boolean,
  p_brand_slug text,
  p_created_at timestamptz,
  p_needs_material_review boolean DEFAULT false
)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  keys text[] := '{}'::text[];
  new_in_brands text[] := ARRAY[
    'frame','vince','theory','toteme','ganni','staud','khaite','isabel-marant',
    'rag-and-bone','citizens-of-humanity','reformation','nili-lotan'
  ]::text[];
  slugs text[] := coalesce(p_collection_slugs, '{}'::text[]);
BEGIN
  IF NOT coalesce(p_needs_material_review, false) THEN
    CASE p_material_primary
      WHEN 'silk' THEN keys := keys || 'fabrics:silk';
      WHEN 'linen' THEN keys := keys || 'fabrics:linen';
      WHEN 'cashmere' THEN keys := keys || 'fabrics:cashmere';
      WHEN 'wool' THEN keys := keys || 'fabrics:wool';
      WHEN 'cotton' THEN keys := keys || 'fabrics:cotton';
      WHEN 'leather_suede' THEN keys := keys || 'fabrics:leather-suede';
      ELSE NULL;
    END CASE;
  END IF;
  IF slugs && ARRAY['vacation-shop','vacation-edit']::text[] THEN keys := keys || 'collections:vacation'; END IF;
  IF slugs && ARRAY['evening-edit','evening']::text[] THEN keys := keys || 'collections:evening'; END IF;
  IF slugs && ARRAY['tailoring-edit','tailoring']::text[] THEN keys := keys || 'collections:tailoring'; END IF;
  IF slugs && ARRAY['white-edit','the-white-edit']::text[] THEN keys := keys || 'collections:white-edit'; END IF;
  IF slugs && ARRAY['city-wardrobe','summer-in-the-city']::text[] THEN keys := keys || 'collections:summer-in-the-city'; END IF;
  IF p_is_sale IS TRUE THEN keys := keys || 'sale:all'; END IF;
  IF p_brand_slug = ANY (new_in_brands) AND p_created_at >= (now() - interval '90 days') THEN
    keys := keys || 'top:new_in';
  END IF;
  RETURN keys;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_infer_rail_keys_from_composition(
  p_composition text,
  p_material_metadata jsonb,
  p_collection_slugs text[],
  p_is_sale boolean,
  p_brand_slug text,
  p_created_at timestamptz
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.catalog_infer_rail_keys(
    public.catalog_parse_composition_material(p_composition, p_material_metadata)->>'primary_material',
    p_collection_slugs,
    p_is_sale,
    p_brand_slug,
    p_created_at,
    coalesce((public.catalog_parse_composition_material(p_composition, p_material_metadata)->>'needs_material_review')::boolean, true)
  );
$$;

-- -----------------------------------------------------------------------------
-- Derived columns on product_offer_classification (if table exists)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_offer_classification'
  ) THEN
    ALTER TABLE public.product_offer_classification
      ADD COLUMN IF NOT EXISTS primary_material text,
      ADD COLUMN IF NOT EXISTS primary_material_percent smallint,
      ADD COLUMN IF NOT EXISTS secondary_materials text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS material_component_notes text,
      ADD COLUMN IF NOT EXISTS material_classification_confidence smallint,
      ADD COLUMN IF NOT EXISTS needs_material_review boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Completeness uses body parser (unknown / needs_material_review → needs_review)
CREATE OR REPLACE FUNCTION public.catalog_offer_completeness_status(
  p_category text,
  p_name text,
  p_composition text,
  p_image_url text,
  p_price text,
  p_url text,
  p_currency text
)
RETURNS text
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  excl text;
  parsed jsonb;
  garment text;
BEGIN
  excl := public.catalog_consumer_exclusion_reason(
    p_category, p_name, p_composition, p_image_url, p_price, p_url
  );
  IF excl IS NOT NULL THEN RETURN 'excluded'; END IF;
  IF p_currency IS NULL OR trim(coalesce(p_currency, '')) = '' THEN RETURN 'needs_review'; END IF;
  parsed := public.catalog_parse_composition_material(p_composition, NULL);
  IF coalesce((parsed->>'needs_material_review')::boolean, true)
     OR (parsed->>'primary_material') IN ('unknown_material', '') THEN
    RETURN 'needs_review';
  END IF;
  garment := public.catalog_classify_garment(p_category, p_name);
  IF garment = 'needs_review' THEN RETURN 'needs_review'; END IF;
  RETURN 'complete';
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_offer_needs_review_reason(
  p_category text,
  p_name text,
  p_composition text,
  p_image_url text,
  p_price text,
  p_url text,
  p_currency text
)
RETURNS text
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  st text;
  parsed jsonb;
BEGIN
  st := public.catalog_offer_completeness_status(
    p_category, p_name, p_composition, p_image_url, p_price, p_url, p_currency
  );
  IF st = 'complete' THEN RETURN NULL; END IF;
  IF st = 'excluded' THEN
    RETURN public.catalog_consumer_exclusion_reason(
      p_category, p_name, p_composition, p_image_url, p_price, p_url
    );
  END IF;
  IF p_currency IS NULL OR trim(coalesce(p_currency, '')) = '' THEN RETURN 'missing_currency'; END IF;
  parsed := public.catalog_parse_composition_material(p_composition, NULL);
  IF coalesce((parsed->>'needs_material_review')::boolean, true) THEN RETURN 'needs_material_review'; END IF;
  IF (parsed->>'primary_material') = 'unknown_material' THEN RETURN 'unknown_material'; END IF;
  IF public.catalog_classify_garment(p_category, p_name) = 'needs_review' THEN RETURN 'unknown_garment'; END IF;
  RETURN 'incomplete';
END;
$$;

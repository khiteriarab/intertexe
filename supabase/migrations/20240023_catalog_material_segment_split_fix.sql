-- =============================================================================
-- Fix: single-line compositions (e.g. "100% Cotton ... Embroidery: 100% Silk")
-- Previously the whole line was treated as body and embroidery silk counted.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.catalog_normalize_composition_text(p_composition text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  comp text := trim(coalesce(p_composition, ''));
BEGIN
  IF comp = '' THEN RETURN comp; END IF;
  comp := regexp_replace(comp, E'[\\r\\n]+', E'\n', 'g');
  -- Break before secondary component labels (inline feeds often omit newlines)
  comp := regexp_replace(comp, E'(?i)\\s+trim\\s*:', E'\ntrim:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+embroidery\\s+fabric', E'\nembroidery fabric', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+embroidery\\s*:', E'\nembroidery:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+lining\\s*:', E'\nlining:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+contrast\\s*:', E'\ncontrast:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+pocket(ing)?\\s*:', E'\npocket:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+rib\\s*:', E'\nrib:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+button\\s*:', E'\nbutton:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+decoration\\s*:', E'\ndecoration:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+appliqu[eé]\\s*:', E'\nappliqué:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+label\\s*:', E'\nlabel:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+collar\\s*:', E'\ncollar:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+cuff\\s*:', E'\ncuff:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+placket\\s*:', E'\nplacket:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+exclusive of\\b', E'\nexclusive of', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+excluding\\b', E'\nexcluding', 'g');
  RETURN comp;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_composition_body_prefix(p_line text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(regexp_replace(
    coalesce(p_line, ''),
    E'(?i)\\s*(,|;)?\\s*(trim|embroidery\\s+fabric|embroidery|lining|contrast|pocket|rib|button|decoration|appliqu[eé]|label|collar|cuff|placket|exclusive of|excluding)\\b.*$',
    '',
    'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.catalog_composition_has_secondary_marker(p_line text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(p_line, '') ~* '(trim|embroidery\\s+fabric|embroidery|lining|contrast|pocket|rib|button|decoration|appliqu|label|collar|cuff|placket|exclusive of|excluding)\\s*:?';
$$;

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
  comp text := public.catalog_normalize_composition_text(trim(coalesce(p_composition, '')));
  lines text[];
  ln text;
  body_ln text;
  i int;
  is_secondary boolean;
  body_lines text[] := '{}'::text[];
  secondary_fibers text[] := '{}'::text[];
  notes text[] := '{}'::text[];
  m text[];
  mat text;
  pct int;
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

  lines := regexp_split_to_array(comp, E'\\n|;|\\|');

  FOR i IN 1 .. coalesce(array_length(lines, 1), 0) LOOP
    ln := trim(lines[i]);
    IF ln = '' THEN CONTINUE; END IF;

    is_secondary := public.catalog_composition_segment_is_secondary(ln);

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

    -- Mixed line: "100% Cotton Trim: ... Embroidery: 100% Silk" — body prefix only
    IF public.catalog_composition_has_secondary_marker(ln) THEN
      body_ln := public.catalog_composition_body_prefix(ln);
      notes := notes || 'mixed line; body prefix only';
      ln := body_ln;
      IF ln = '' THEN CONTINUE; END IF;
    END IF;

    IF ln ~ '^\s*(shell|body|main|outer|self|garment|fabric)\s*[:]'
       OR ln ~ '^\s*\d+\s*%'
       OR ln <> '' THEN
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

  IF array_length(body_lines, 1) IS NULL AND array_length(lines, 1) > 0 THEN
    FOR i IN 1 .. array_length(lines, 1) LOOP
      ln := trim(lines[i]);
      IF ln = '' OR public.catalog_composition_segment_is_secondary(ln) THEN CONTINUE; END IF;
      IF public.catalog_composition_has_secondary_marker(ln) THEN
        ln := public.catalog_composition_body_prefix(ln);
      END IF;
      IF ln = '' THEN CONTINUE; END IF;
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

  IF total_body_w > 0 AND primary_pct > 0 THEN
    primary_pct := round((primary_pct::numeric / total_body_w::numeric) * 100)::int;
  END IF;

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
    IF (CASE WHEN silk_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN cashmere_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN wool_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN linen_w > 0 THEN 1 ELSE 0 END +
        CASE WHEN cotton_w > 0 THEN 1 ELSE 0 END) > 1 AND primary_pct < 60 THEN
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

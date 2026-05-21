-- =============================================================================
-- Composition parser: body/shell only, cap natural fiber at 100%, split secondary
-- segments (e.g. "100% Linen. Ribbed parts: 100% Cotton" → linen 100%, not 200%).
-- Does NOT modify products.composition (source truth).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Normalize: split period-separated secondary clauses onto new lines
-- -----------------------------------------------------------------------------
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
  comp := regexp_replace(comp, E'(?i)<br\\s*/?>', E'\n', 'g');
  comp := regexp_replace(comp, E'(?i)&lt;br\\s*/?&gt;', E'\n', 'g');
  comp := regexp_replace(comp, E'[•·▪]', E'\n', 'g');
  comp := regexp_replace(comp, E'[\\r\\n]+', E'\n', 'g');
  -- Period before secondary component labels (common retailer format)
  comp := regexp_replace(
    comp,
    E'(?i)\\.\\s+(?=(rib(?:bed)?\\s*parts?|rib(?:bed)?|trim|embroidery|lining|contrast|pocket(?:ing)?|button|decoration|appliqu[eé]|applique|label|collar|cuff|placket|overlay|bead|sequin|interlining|underlay|facing|exclusive of|excluding|excl\\.|detail\\s*fabric|panel\\s*trim|lace\\s*trim|neckline|shoulder|sleeve\\s*trim|hem\\s*trim|yoke\\s*trim|trimming)\\s*[:])',
    E'\n',
    'g'
  );
  comp := regexp_replace(comp, E'(?i)\\s+trim\\s*:', E'\ntrim:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+embroidery\\s+fabric', E'\nembroidery fabric', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+embroidery\\s*:', E'\nembroidery:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+lining\\s*:', E'\nlining:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+contrast\\s*:', E'\ncontrast:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+pocket(ing)?\\s*:', E'\npocket:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+rib(?:bed)?\\s*parts?\\s*:', E'\nribbed parts:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+rib(?:bed)?\\s*:', E'\nrib:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+button\\s*:', E'\nbutton:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+decoration\\s*:', E'\ndecoration:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+appliqu[eé]\\s*:', E'\nappliqué:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+label\\s*:', E'\nlabel:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+collar\\s*:', E'\ncollar:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+cuff\\s*:', E'\ncuff:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+placket\\s*:', E'\nplacket:', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+exclusive of\\b', E'\nexclusive of', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+excluding\\b', E'\nexcluding', 'g');
  comp := regexp_replace(comp, E'(?i)\\s+(shell|body|main|outer|self|garment|fabric)\\s*:', E'\n\1:', 'g');
  RETURN comp;
END;
$$;

-- -----------------------------------------------------------------------------
-- Secondary segment detector (trim, ribbed parts, lining, …)
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
  IF ln ~ '^\s*(trim|embroidery|lining|contrast|pocket|rib(?:bed)?(?:\s*parts?)?|button|decoration|appliqu[eé]|applique|label|collar|cuff|placket|overlay|bead|sequin|interlining|underlay|facing|belt\s*loop|elastic\s*trim|gusset|hood\s*lining|pocketing|exclusive\s+of|excluding|excl\.|detail\s*fabric|panel\s*trim|lace\s*trim|neckline|shoulder|sleeve\s*trim|hem\s*trim|yoke\s*trim|trimming)\s*[:]' THEN
    RETURN true;
  END IF;
  IF ln ~ '(^|[^a-z])(trim|embroidery|lining|contrast|pocketing|rib(?:bed)?(?:\s*parts?)?|appliqu[eé]|beadwork|sequin)\s*[:]' THEN
    RETURN true;
  END IF;
  IF ln ~ '(exclusive of trim|excluding trim|exclusive of decoration)' THEN RETURN true; END IF;
  RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- Parse composition → primary body fiber + capped natural fiber %
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
  comp text := public.catalog_normalize_composition_text(p_composition);
  lines text[];
  ln text;
  i int;
  is_secondary boolean;
  is_body boolean;
  body_lines text[] := '{}'::text[];
  secondary_fibers text[] := '{}'::text[];
  notes text[] := '{}'::text[];
  m text[];
  mat text;
  pct int;
  silk_w int := 0; cashmere_w int := 0; wool_w int := 0; linen_w int := 0;
  cotton_w int := 0; leather_w int := 0; viscose_w int := 0; synth_w int := 0;
  total_body_w int := 0;
  natural_body_w int := 0;
  primary_material text := 'unknown_material';
  primary_pct int := 0;
  natural_fiber_body_percent int := 0;
  confidence int := 0;
  needs_review boolean := true;
  winner_w int := 0;
  body_locked boolean := false;
BEGIN
  IF comp = '' THEN
    RETURN jsonb_build_object(
      'primary_material', 'unknown_material',
      'primary_material_percent', NULL,
      'natural_fiber_body_percent', 0,
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

    IF is_body AND NOT body_locked THEN
      body_lines := body_lines || ln;
      body_locked := true;
      FOR m IN SELECT regexp_matches(ln, '(\d+)\s*%\s*([a-z][a-z\s-]{2,40})', 'gi') LOOP
        pct := LEAST(100, GREATEST(0, m[1]::int));
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
    ELSIF is_body AND body_locked THEN
      notes := array_append(notes, 'ignored extra body segment: ' || ln);
    END IF;
  END LOOP;

  IF array_length(body_lines, 1) IS NULL AND array_length(lines, 1) > 0 THEN
    FOR i IN 1 .. array_length(lines, 1) LOOP
      ln := trim(lines[i]);
      IF ln = '' THEN CONTINUE; END IF;
      IF public.catalog_composition_segment_is_secondary(ln) THEN CONTINUE; END IF;
      body_lines := ARRAY[ln];
      FOR m IN SELECT regexp_matches(ln, '(\d+)\s*%\s*([a-z][a-z\s-]{2,40})', 'gi') LOOP
        pct := LEAST(100, GREATEST(0, m[1]::int));
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
      'natural_fiber_body_percent', 0,
      'secondary_materials', to_jsonb(secondary_fibers),
      'material_component_notes', 'no confident body/shell segment',
      'material_classification_confidence', 0,
      'needs_material_review', true
    );
  END IF;

  natural_body_w := silk_w + cashmere_w + wool_w + linen_w + cotton_w + leather_w;
  IF total_body_w > 0 THEN
    natural_fiber_body_percent := LEAST(
      100,
      GREATEST(0, round((natural_body_w::numeric / total_body_w::numeric) * 100)::int)
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
    primary_pct := LEAST(100, GREATEST(0, round((primary_pct::numeric / total_body_w::numeric) * 100)::int));
  END IF;

  IF primary_material IN ('silk', 'linen', 'cashmere', 'wool', 'cotton', 'leather_suede')
     AND primary_pct >= 80 AND array_length(body_lines, 1) = 1 THEN
    needs_review := false;
    confidence := 90;
    natural_fiber_body_percent := LEAST(100, GREATEST(natural_fiber_body_percent, primary_pct));
  ELSIF primary_material IN ('silk', 'linen', 'cashmere', 'wool', 'cotton', 'leather_suede') AND primary_pct >= 50 THEN
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
    'natural_fiber_body_percent', natural_fiber_body_percent,
    'secondary_materials', to_jsonb(secondary_fibers),
    'material_component_notes', array_to_string(notes, '; '),
    'material_classification_confidence', confidence,
    'needs_material_review', needs_review
  );
END;
$$;

COMMENT ON FUNCTION public.catalog_parse_composition_material IS
  'Body/shell fiber only. Secondary segments (rib, trim, lining, …) excluded. natural_fiber_body_percent capped at 100.';

-- -----------------------------------------------------------------------------
-- Consumer-facing natural fiber % (derived; does not read composition text only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_derived_natural_fiber_percent(
  p_composition text,
  p_material_metadata jsonb DEFAULT NULL,
  p_stored_nfp integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  parsed jsonb;
  derived int;
  stored int := coalesce(p_stored_nfp, 0);
BEGIN
  parsed := public.catalog_parse_composition_material(p_composition, p_material_metadata);
  derived := coalesce((parsed->>'natural_fiber_body_percent')::int, 0);
  IF derived > 0 THEN
    RETURN LEAST(100, GREATEST(0, derived));
  END IF;
  RETURN LEAST(100, GREATEST(0, stored));
END;
$$;

COMMENT ON FUNCTION public.catalog_derived_natural_fiber_percent IS
  'Body-only natural fiber % capped at 100. Used for consumer views and correcting summed feed values.';

-- -----------------------------------------------------------------------------
-- Recreate live_products_apparel with derived natural_fiber_percent column
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.products_catalog_scope CASCADE;
DROP VIEW IF EXISTS public.live_products_apparel CASCADE;

DO $$
DECLARE
  col_list text;
  nfp_expr text := 'public.catalog_derived_natural_fiber_percent(p.composition, p.material_metadata, p.natural_fiber_percent::integer)::numeric';
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
    CREATE VIEW public.live_products_apparel AS
    SELECT %s
    FROM public.products AS p
    WHERE p.approved = 'yes'
      AND coalesce(p.is_active, true) IS TRUE
      AND %s
      AND public.homepage_price_listed(p.price, p.image_url)
      AND public.catalog_product_url_valid(p.url)
      AND public.catalog_consumer_exclusion_reason(
        p.category, p.name, p.composition, p.image_url, p.price, p.url
      ) IS NULL
      AND public.catalog_is_womens_apparel_category(p.category, p.name)
  $v$, col_list, filter_nfp);
END $$;

COMMENT ON VIEW public.live_products_apparel IS
  'Women''s apparel: natural_fiber_percent is body-derived (capped 100), not naive sum of all segments.';

CREATE VIEW public.products_catalog_scope AS
SELECT
  p.id,
  p.product_id,
  p.approved,
  p.is_active,
  p.region,
  p.brand_slug,
  p.category,
  public.catalog_derived_natural_fiber_percent(p.composition, p.material_metadata, p.natural_fiber_percent::integer) AS natural_fiber_percent,
  public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) AS display_excluded_reason,
  CASE
    WHEN p.approved IS DISTINCT FROM 'yes' OR coalesce(p.is_active, true) IS FALSE THEN 'raw'
    WHEN public.catalog_consumer_exclusion_reason(
      p.category, p.name, p.composition, p.image_url, p.price, p.url
    ) IS NOT NULL THEN 'excluded'
    WHEN EXISTS (SELECT 1 FROM public.live_products_apparel l WHERE l.id = p.id) THEN 'consumer_apparel'
    WHEN EXISTS (SELECT 1 FROM public.live_products l WHERE l.id = p.id) THEN 'consumer_other'
    ELSE 'excluded'
  END AS catalog_scope
FROM public.products AS p;

GRANT SELECT ON public.live_products_apparel TO anon, authenticated, service_role;
GRANT SELECT ON public.products_catalog_scope TO anon, authenticated, service_role;

-- =============================================================================
-- Harden composition splitting (<br>, bullets) + strict rail eligibility guard
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
  comp := regexp_replace(comp, E'(?i)<br\\s*/?>', E'\n', 'g');
  comp := regexp_replace(comp, E'(?i)&lt;br\\s*/?&gt;', E'\n', 'g');
  comp := regexp_replace(comp, E'[•·▪]', E'\n', 'g');
  comp := regexp_replace(comp, E'[\\r\\n]+', E'\n', 'g');
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
  expected text;
BEGIN
  IF needs_rev OR primary_mat IS NULL OR primary_mat IN ('unknown_material', '') THEN
    RETURN false;
  END IF;
  expected := CASE p_fabric_rail
    WHEN 'silk' THEN 'silk'
    WHEN 'linen' THEN 'linen'
    WHEN 'cashmere' THEN 'cashmere'
    WHEN 'wool' THEN 'wool'
    WHEN 'cotton' THEN 'cotton'
    WHEN 'leather_suede' THEN 'leather_suede'
    ELSE NULL
  END;
  IF expected IS NULL THEN RETURN false; END IF;
  RETURN primary_mat = expected;
END;
$$;

-- Purge ineligible rows from a fabric rail cache (safe, cache-only)
CREATE OR REPLACE FUNCTION public.homepage_feed_purge_ineligible_material_rail(p_rail_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fiber text;
  v_deleted int;
BEGIN
  IF p_rail_key NOT LIKE 'fabrics:%' THEN
    RAISE EXCEPTION 'Only fabrics:* rails supported';
  END IF;
  v_fiber := split_part(p_rail_key, ':', 2);
  IF v_fiber = 'leather-suede' THEN v_fiber := 'leather_suede'; END IF;

  DELETE FROM public.homepage_feed_items h
  USING public.live_products_apparel l
  WHERE h.source_id = l.id
    AND h.rail_key = p_rail_key
    AND NOT public.catalog_material_rail_eligible(l.composition, l.material_metadata, v_fiber);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.homepage_feed_purge_ineligible_material_rail(text) TO service_role;

-- RPC for web live-fallback (body/shell eligibility only)
CREATE OR REPLACE FUNCTION public.catalog_offers_for_material_rail(
  p_fiber text,
  p_limit integer DEFAULT 180
)
RETURNS SETOF public.live_products_apparel
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.*
  FROM public.live_products_apparel l
  WHERE public.catalog_material_rail_eligible(l.composition, l.material_metadata, p_fiber)
  ORDER BY l.natural_fiber_percent DESC NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 180), 500));
$$;

GRANT EXECUTE ON FUNCTION public.catalog_offers_for_material_rail(text, integer) TO anon, authenticated, service_role;

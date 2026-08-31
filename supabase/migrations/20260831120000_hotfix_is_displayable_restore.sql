-- EMERGENCY: NFP id-walk backfill re-fired update_is_displayable on ~138k rows with
-- stricter rules (composition required + catalog_consumer_exclusion_reason), hiding most catalog.
-- Keep NFP sync on write; restore is_displayable to pre-NFP-migration consumer gates.

CREATE OR REPLACE FUNCTION public.update_is_displayable()
RETURNS TRIGGER AS $$
DECLARE
  derived_nfp integer;
BEGIN
  IF NEW.composition IS NOT NULL AND trim(NEW.composition) <> '' THEN
    derived_nfp := public.catalog_derived_natural_fiber_percent(
      NEW.composition,
      NEW.material_metadata,
      NEW.natural_fiber_percent::integer
    );
    NEW.natural_fiber_percent := derived_nfp;
  END IF;

  NEW.is_displayable := (
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

COMMENT ON FUNCTION public.update_is_displayable() IS
  'Derives NFP from composition on write; is_displayable uses indexed consumer gates (no exclusion_reason in trigger).';

-- Batch restore: touch rows so fixed trigger recomputes is_displayable.
CREATE OR REPLACE FUNCTION public.restore_is_displayable_batch(p_limit integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  SET LOCAL statement_timeout = '180s';

  WITH pick AS (
    SELECT p.id
    FROM public.products AS p
    WHERE p.approved = 'yes'
      AND coalesce(p.is_active, true) IS TRUE
      AND coalesce(p.natural_fiber_percent, 0) >= 80
      AND p.is_displayable IS DISTINCT FROM true
    ORDER BY p.id
    LIMIT greatest(100, least(coalesce(p_limit, 5000), 10000))
  ),
  updated AS (
    UPDATE public.products AS p
    SET composition = p.composition
    FROM pick
    WHERE p.id = pick.id
    RETURNING p.id
  )
  SELECT count(*)::integer INTO v_updated FROM updated;

  RETURN coalesce(v_updated, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_is_displayable_batch(integer) TO service_role;

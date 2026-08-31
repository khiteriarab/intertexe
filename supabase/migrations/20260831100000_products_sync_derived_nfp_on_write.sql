-- Keep products.natural_fiber_percent in sync with composition on every write.
-- Prevents feed re-syncs and parser upgrades from leaving stale NFP in the stored column.

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
    AND trim(coalesce(NEW.composition, '')) <> ''
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
    AND public.catalog_consumer_exclusion_reason(
      NEW.category, NEW.name, NEW.composition, NEW.image_url, NEW.price::text, NEW.url
    ) IS NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_is_displayable() IS
  'Derives natural_fiber_percent from composition on write, then sets is_displayable from derived NFP >= 80.';

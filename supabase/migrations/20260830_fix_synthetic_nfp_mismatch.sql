-- Recompute stored natural_fiber_percent from body composition and hide primarily synthetic rows.
-- Fixes cases like Steffany Milano 100% polyester stored as nfp=100.

UPDATE public.products AS p
SET
  natural_fiber_percent = public.catalog_derived_natural_fiber_percent(
    p.composition,
    p.material_metadata,
    p.natural_fiber_percent::integer
  ),
  is_displayable = CASE
    WHEN public.catalog_derived_natural_fiber_percent(
      p.composition,
      p.material_metadata,
      p.natural_fiber_percent::integer
    ) >= 80
      AND public.catalog_consumer_exclusion_reason(
        p.category, p.name, p.composition, p.image_url, p.price, p.url
      ) IS NULL
    THEN coalesce(p.is_displayable, true)
    ELSE false
  END
WHERE p.composition IS NOT NULL
  AND trim(p.composition) <> ''
  AND (
    p.natural_fiber_percent IS DISTINCT FROM public.catalog_derived_natural_fiber_percent(
      p.composition,
      p.material_metadata,
      p.natural_fiber_percent::integer
    )
    OR (
      p.natural_fiber_percent >= 70
      AND public.catalog_derived_natural_fiber_percent(
        p.composition,
        p.material_metadata,
        p.natural_fiber_percent::integer
      ) < 70
    )
  );

COMMENT ON COLUMN public.products.natural_fiber_percent IS
  'Stored body natural fiber %. Must match catalog_derived_natural_fiber_percent(composition) for displayable rows.';

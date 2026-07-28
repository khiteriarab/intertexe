-- Fix MyTheresa US rows mistagged as region=eu despite Rakuten MID 43172 (US/CA)
-- and USD + mytheresa.com/us storefront links. Safe to re-run.
UPDATE public.products
SET region = 'us'
WHERE region IS DISTINCT FROM 'us'
  AND (
    url ILIKE '%mid=43172%'
    OR url ILIKE '%mytheresa.com%2Fus%2F%'
    OR url ILIKE '%mytheresa.com/us/%'
  );

-- Soft-disable broken Alaïa slug alias (diacritic mangled to ala-a).
UPDATE public.designers
SET is_live = false,
    product_count = 0,
    status = 'redirected'
WHERE slug = 'ala-a';

-- Ensure canonical Alaïa + major shoe houses stay live when inventory exists.
UPDATE public.designers d
SET is_live = true,
    status = 'Approved',
    product_count = GREATEST(
      COALESCE(d.product_count, 0),
      (
        SELECT COUNT(*)::int
        FROM public.products p
        WHERE p.brand_slug = d.slug
          AND p.is_displayable IS TRUE
      )
    )
WHERE d.slug IN ('alaia', 'jimmy-choo', 'aquazzura', 'manolo-blahnik', 'roger-vivier', 'gianvito-rossi')
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.brand_slug = d.slug
      AND p.is_displayable IS TRUE
    LIMIT 1
  );

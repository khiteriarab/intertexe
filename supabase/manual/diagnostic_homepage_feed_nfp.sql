-- Diagnostic: homepage feed rows with stale/missing NFP vs products.composition truth.
-- Run read-only in Supabase SQL editor before/after refresh_homepage_feeds_v2.

-- 1) Feed rows showing 0% NFP but products has valid natural fiber composition
SELECT
  h.rail_key,
  h.rank,
  h.brand_name,
  h.name,
  h.natural_fiber_percent AS feed_nfp,
  public.catalog_derived_natural_fiber_percent(
    p.composition,
    p.material_metadata,
    p.natural_fiber_percent::integer
  ) AS derived_nfp,
  left(p.composition, 80) AS composition_preview
FROM public.homepage_feed_items AS h
JOIN public.products AS p ON p.id = h.source_id
WHERE h.natural_fiber_percent < 70
  AND public.catalog_derived_natural_fiber_percent(
    p.composition,
    p.material_metadata,
    p.natural_fiber_percent::integer
  ) >= 70
ORDER BY h.rail_key, h.rank;

-- 2) Summary counts per rail
SELECT
  h.rail_key,
  count(*) FILTER (WHERE h.natural_fiber_percent < 70) AS feed_below_70,
  count(*) FILTER (
    WHERE h.natural_fiber_percent < 70
      AND public.catalog_derived_natural_fiber_percent(
        p.composition, p.material_metadata, p.natural_fiber_percent::integer
      ) >= 70
  ) AS stale_zero_or_low,
  count(*) AS total_rows
FROM public.homepage_feed_items AS h
JOIN public.products AS p ON p.id = h.source_id
GROUP BY h.rail_key
ORDER BY h.rail_key;

-- 3) Products table rows where stored NFP disagrees with composition (run fix migration first)
SELECT count(*) AS products_nfp_mismatch
FROM public.products AS p
WHERE p.composition IS NOT NULL
  AND trim(p.composition) <> ''
  AND p.natural_fiber_percent IS DISTINCT FROM public.catalog_derived_natural_fiber_percent(
    p.composition,
    p.material_metadata,
    p.natural_fiber_percent::integer
  );

-- After fixes:
-- SELECT public.refresh_homepage_feeds_v2('us');

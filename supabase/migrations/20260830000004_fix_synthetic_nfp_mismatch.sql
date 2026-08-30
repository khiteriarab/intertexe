-- Batched recompute of stored natural_fiber_percent from body composition.
-- The monolithic UPDATE timed out on production; run batches via manual script instead.
-- Fixes cases like Steffany Milano 100% polyester stored as nfp=100.

CREATE OR REPLACE FUNCTION public.fix_synthetic_nfp_mismatch_batch(
  p_limit integer DEFAULT 2000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
  v_lim integer := greatest(1, least(coalesce(p_limit, 2000), 10000));
BEGIN
  SET LOCAL statement_timeout = '120s';

  WITH candidates AS (
    SELECT p.id
    FROM public.products AS p
    WHERE p.composition IS NOT NULL
      AND trim(p.composition) <> ''
      AND (
        p.natural_fiber_percent IS DISTINCT FROM public.catalog_derived_natural_fiber_percent(
          p.composition,
          p.material_metadata,
          p.natural_fiber_percent::integer
        )
        OR (
          coalesce(p.natural_fiber_percent, 0) >= 70
          AND public.catalog_derived_natural_fiber_percent(
            p.composition,
            p.material_metadata,
            p.natural_fiber_percent::integer
          ) < 70
        )
      )
    ORDER BY p.id
    LIMIT v_lim
  )
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
  FROM candidates c
  WHERE p.id = c.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.fix_synthetic_nfp_mismatch_batch(integer) IS
  'Fix up to p_limit products where stored NFP disagrees with composition-derived body NFP. Run repeatedly until 0.';

GRANT EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_batch(integer) TO service_role;

-- Remaining mismatch count (read-only helper)
CREATE OR REPLACE FUNCTION public.count_synthetic_nfp_mismatch()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.products AS p
  WHERE p.composition IS NOT NULL
    AND trim(p.composition) <> ''
    AND (
      p.natural_fiber_percent IS DISTINCT FROM public.catalog_derived_natural_fiber_percent(
        p.composition,
        p.material_metadata,
        p.natural_fiber_percent::integer
      )
      OR (
        coalesce(p.natural_fiber_percent, 0) >= 70
        AND public.catalog_derived_natural_fiber_percent(
          p.composition,
          p.material_metadata,
          p.natural_fiber_percent::integer
        ) < 70
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_synthetic_nfp_mismatch() TO service_role;

COMMENT ON COLUMN public.products.natural_fiber_percent IS
  'Stored body natural fiber %. Must match catalog_derived_natural_fiber_percent(composition) for displayable rows.';

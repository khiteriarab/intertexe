-- Id-walk NFP repair: bounded scan per call (avoids full-table mismatch search timeouts).

CREATE OR REPLACE FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(
  p_after_id uuid DEFAULT '00000000-0000-0000-0000-000000000000',
  p_scan_limit integer DEFAULT 800,
  p_fix_limit integer DEFAULT 400
)
RETURNS TABLE(rows_updated integer, last_scanned_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_last uuid;
  v_scan integer := greatest(50, least(coalesce(p_scan_limit, 800), 5000));
  v_fix integer := greatest(1, least(coalesce(p_fix_limit, 400), 5000));
BEGIN
  SET LOCAL statement_timeout = '120s';

  DROP TABLE IF EXISTS _nfp_id_batch;

  CREATE TEMP TABLE _nfp_id_batch (
    id uuid PRIMARY KEY,
    composition text,
    material_metadata jsonb,
    natural_fiber_percent integer
  ) ON COMMIT DROP;

  INSERT INTO _nfp_id_batch (id, composition, material_metadata, natural_fiber_percent)
  SELECT
    p.id,
    p.composition,
    p.material_metadata,
    p.natural_fiber_percent
  FROM public.products AS p
  WHERE p.id > coalesce(p_after_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND p.composition IS NOT NULL
    AND trim(p.composition) <> ''
  ORDER BY p.id
  LIMIT v_scan;

  SELECT b.id INTO v_last FROM _nfp_id_batch AS b ORDER BY b.id DESC LIMIT 1;

  WITH mismatches AS (
    SELECT b.id
    FROM _nfp_id_batch AS b
    WHERE public.catalog_derived_natural_fiber_percent(
            b.composition,
            b.material_metadata,
            b.natural_fiber_percent::integer
          ) IS DISTINCT FROM b.natural_fiber_percent
       OR (
            coalesce(b.natural_fiber_percent, 0) >= 70
            AND public.catalog_derived_natural_fiber_percent(
              b.composition,
              b.material_metadata,
              b.natural_fiber_percent::integer
            ) < 70
          )
    ORDER BY b.id
    LIMIT v_fix
  ),
  updated AS (
    UPDATE public.products AS p
    SET composition = p.composition
    FROM mismatches AS m
    WHERE p.id = m.id
    RETURNING p.id
  )
  SELECT count(*)::integer INTO v_updated FROM updated;

  rows_updated := coalesce(v_updated, 0);
  last_scanned_id := coalesce(v_last, p_after_id);
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(uuid, integer, integer) IS
  'Walk products by id, fix up to p_fix_limit mismatches within the next p_scan_limit rows.';

GRANT EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(uuid, integer, integer) TO service_role;

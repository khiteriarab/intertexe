-- Hard stop: batch product-table repair must not run against live catalog.
-- Normal feed ingest still updates rows one-at-a-time via update_is_displayable trigger.
-- Re-enable only by restoring function bodies from prior migrations during a maintenance window.

CREATE OR REPLACE FUNCTION public.fix_synthetic_nfp_mismatch_batch(p_limit integer DEFAULT 2000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'fix_synthetic_nfp_mismatch_batch is disabled on production. Set CATALOG_BULK_MUTATIONS_ENABLED=true and restore the function from migration 20260830000004 during a planned maintenance window.';
END;
$$;

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
BEGIN
  RAISE EXCEPTION
    'fix_synthetic_nfp_mismatch_id_batch is disabled on production. Set CATALOG_BULK_MUTATIONS_ENABLED=true and restore the function from migration 20260831000002 during a planned maintenance window.';
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_is_displayable_batch(p_limit integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'restore_is_displayable_batch is disabled on production. Set CATALOG_BULK_MUTATIONS_ENABLED=true and restore the function from migration 20260831120000 during a planned maintenance window.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_batch(integer)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.restore_is_displayable_batch(integer)
  FROM PUBLIC, anon, authenticated, service_role;

-- Production safety: block PostgREST/cron from mass product-table repair scans.
-- The trigger still syncs NFP on normal feed writes; this only disables batch repair RPCs.
-- To re-enable during maintenance:
--   GRANT EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_batch(integer) TO service_role;
--   GRANT EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(uuid, integer, integer) TO service_role;
--   GRANT EXECUTE ON FUNCTION public.restore_is_displayable_batch(integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_batch(integer)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.restore_is_displayable_batch(integer)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.fix_synthetic_nfp_mismatch_batch(integer) IS
  'DISABLED in production — batch NFP repair. Re-grant EXECUTE to service_role for maintenance only.';

COMMENT ON FUNCTION public.fix_synthetic_nfp_mismatch_id_batch(uuid, integer, integer) IS
  'DISABLED in production — id-walk NFP repair. Re-grant EXECUTE to service_role for maintenance only.';

COMMENT ON FUNCTION public.restore_is_displayable_batch(integer) IS
  'DISABLED in production — batch is_displayable restore. Re-grant EXECUTE to service_role for maintenance only.';

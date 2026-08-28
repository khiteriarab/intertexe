-- Source records stay immutable under UPDATE. DELETE is required for
-- organization-deletion cascade and must not be blocked.

DROP TRIGGER IF EXISTS source_records_immutable ON public.source_records;
CREATE TRIGGER source_records_immutable
  BEFORE UPDATE ON public.source_records
  FOR EACH ROW EXECUTE FUNCTION public.forbid_source_record_mutation();

NOTIFY pgrst, 'reload schema';

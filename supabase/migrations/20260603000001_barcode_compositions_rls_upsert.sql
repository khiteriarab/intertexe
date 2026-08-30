-- Allow client upserts (INSERT + UPDATE on conflict) for barcode_compositions.
-- Previous barcode_update policy restricted UPDATE to service_role only, breaking iOS upsert.

DROP POLICY IF EXISTS barcode_update ON public.barcode_compositions;
CREATE POLICY barcode_update ON public.barcode_compositions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

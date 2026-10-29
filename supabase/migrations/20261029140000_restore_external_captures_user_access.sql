-- Restore Inspirations (external_captures) + capture_events for authenticated users.
--
-- 20261020180000_fix_rls_disabled_in_public.sql incorrectly locked these as
-- "internal/ops": dropped own-row policies and REVOKE'd authenticated grants.
-- Result: GET /api/capture → permission denied → iOS Inspirations "cancelled"/empty.
--
-- Keep RLS ON. No anon access. Own-row only for authenticated. service_role full.

ALTER TABLE public.external_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capture_events ENABLE ROW LEVEL SECURITY;

-- external_captures ----------------------------------------------------------
DROP POLICY IF EXISTS "external_captures_select_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_insert_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_update_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_delete_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_service_role" ON public.external_captures;

CREATE POLICY "external_captures_select_own"
  ON public.external_captures FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "external_captures_insert_own"
  ON public.external_captures FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "external_captures_update_own"
  ON public.external_captures FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "external_captures_delete_own"
  ON public.external_captures FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "external_captures_service_role"
  ON public.external_captures FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.external_captures FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.external_captures TO authenticated;
GRANT ALL ON TABLE public.external_captures TO service_role;

-- capture_events -------------------------------------------------------------
DROP POLICY IF EXISTS "capture_events_select_own" ON public.capture_events;
DROP POLICY IF EXISTS "capture_events_insert_own" ON public.capture_events;
DROP POLICY IF EXISTS "capture_events_service_role" ON public.capture_events;

CREATE POLICY "capture_events_select_own"
  ON public.capture_events FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "capture_events_insert_own"
  ON public.capture_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "capture_events_service_role"
  ON public.capture_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.capture_events FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.capture_events TO authenticated;
GRANT ALL ON TABLE public.capture_events TO service_role;

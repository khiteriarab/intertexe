-- Authenticated org members may write their own audit rows.
-- Required once the dashboard data plane uses user JWTs instead of service role.

DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.can_mutate_org(organization_id));

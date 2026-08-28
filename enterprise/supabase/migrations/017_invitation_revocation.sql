-- Founder-managed invitation lifecycle (revoke/regenerate with audit).

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE INDEX IF NOT EXISTS invitations_org_created_idx
  ON public.invitations (organization_id, created_at DESC);

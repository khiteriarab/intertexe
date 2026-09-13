-- Commercial lifecycle fields for customer org workspaces (SaaS — not founder HQ).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pilot_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pilot_completed_at timestamptz;

ALTER TABLE public.billing_accounts
  ADD COLUMN IF NOT EXISTS implementation_fee_status text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.organizations.pilot_started_at IS 'When the 10-product pilot workspace was activated for this org.';
COMMENT ON COLUMN public.organizations.pilot_completed_at IS 'When the org upgraded from pilot to a paid plan.';
COMMENT ON COLUMN public.billing_accounts.implementation_fee_status IS 'none | pending | paid | waived';

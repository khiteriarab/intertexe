-- Billing entitlements hardening: plan enum extension, lifecycle columns, webhook idempotency.

DO $$ BEGIN
  ALTER TYPE public.enterprise_plan_key ADD VALUE IF NOT EXISTS 'demo';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.enterprise_plan_key ADD VALUE IF NOT EXISTS 'platform';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.enterprise_plan_key ADD VALUE IF NOT EXISTS 'professional';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.enterprise_plan_key ADD VALUE IF NOT EXISTS 'enterprise';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.billing_accounts
  ADD COLUMN IF NOT EXISTS billing_provider text,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS billing_price_id text,
  ADD COLUMN IF NOT EXISTS billing_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS billing_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz,
  ADD COLUMN IF NOT EXISTS contract_id text,
  ADD COLUMN IF NOT EXISTS billing_metadata jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.billing_accounts.billing_provider IS 'paddle | manual | null for demo';
COMMENT ON COLUMN public.billing_accounts.billing_status IS 'none | active | past_due | grace_period | restricted | canceled | paused';
COMMENT ON COLUMN public.billing_accounts.grace_period_until IS 'End of grace after past_due — do not delete data or public passports before this.';

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'paddle',
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_org
  ON public.billing_webhook_events(organization_id, processed_at DESC);

CREATE TABLE IF NOT EXISTS public.billing_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_kind text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_events_org
  ON public.billing_audit_events(organization_id, created_at DESC);

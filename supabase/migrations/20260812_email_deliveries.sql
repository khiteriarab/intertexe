-- Durable email delivery log + founder-welcome idempotency.
-- Additive / safe: new table + indexes only.

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  email text NOT NULL,
  email_type text NOT NULL,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  scheduled_at timestamptz NULL,
  sent_at timestamptz NULL,
  delivered_at timestamptz NULL,
  bounced_at timestamptz NULL,
  complained_at timestamptz NULL,
  failed_at timestamptz NULL,
  failure_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_deliveries IS
  'Customer-facing Resend delivery log. founder_welcome is idempotent per user/email.';

CREATE INDEX IF NOT EXISTS idx_email_deliveries_email_type_created
  ON public.email_deliveries (email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_provider_message_id
  ON public.email_deliveries (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_deliveries_user_id
  ON public.email_deliveries (user_id)
  WHERE user_id IS NOT NULL;

-- One active/successful founder welcome per authenticated user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_founder_welcome_user
  ON public.email_deliveries (user_id)
  WHERE email_type = 'founder_welcome'
    AND user_id IS NOT NULL
    AND status IN ('pending', 'sent', 'delivered');

-- Email fallback when user_id is unavailable (legacy paths only).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_founder_welcome_email
  ON public.email_deliveries (lower(email))
  WHERE email_type = 'founder_welcome'
    AND user_id IS NULL
    AND status IN ('pending', 'sent', 'delivered');

ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;

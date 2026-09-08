-- Phase C: Paddle Billing hooks (B2B org subscriptions).

ALTER TABLE public.billing_accounts
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text;

CREATE INDEX IF NOT EXISTS billing_accounts_paddle_customer_idx
  ON public.billing_accounts (paddle_customer_id)
  WHERE paddle_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_accounts_paddle_subscription_idx
  ON public.billing_accounts (paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

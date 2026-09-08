-- Phase B: extend data_carriers (no new table) + billing account Stripe hooks.

ALTER TABLE public.data_carriers
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS persistent_identity_id uuid REFERENCES public.persistent_identities (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('draft', 'active', 'retired')),
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS retired_at timestamptz,
  ADD COLUMN IF NOT EXISTS batch_label text,
  ADD COLUMN IF NOT EXISTS encoding_format text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.data_carriers dc
SET product_id = p.product_id
FROM public.passports p
WHERE dc.passport_id = p.id
  AND dc.product_id IS NULL;

UPDATE public.data_carriers
SET activated_at = COALESCE(activated_at, created_at)
WHERE state = 'active';

CREATE INDEX IF NOT EXISTS data_carriers_product_idx
  ON public.data_carriers (organization_id, product_id, state);

CREATE UNIQUE INDEX IF NOT EXISTS data_carriers_one_active_per_type
  ON public.data_carriers (passport_id, carrier_type)
  WHERE state = 'active';

DROP TRIGGER IF EXISTS data_carriers_updated_at ON public.data_carriers;
CREATE TRIGGER data_carriers_updated_at
  BEFORE UPDATE ON public.data_carriers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_key text,
  ADD COLUMN IF NOT EXISTS billing_email text;

CREATE INDEX IF NOT EXISTS billing_accounts_stripe_customer_idx
  ON public.billing_accounts (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

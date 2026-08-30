-- Push alert dedupe + cross-device catalog filter prefs.

CREATE TABLE IF NOT EXISTS public.price_drop_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  old_price numeric,
  new_price numeric NOT NULL,
  emailed_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.price_drop_notifications IS
  'Dedupe log for price-drop and sale-alert email/push notifications per user+product+price.';

ALTER TABLE public.price_drop_notifications
  ADD COLUMN IF NOT EXISTS pushed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_price_drop_notifications_push_dedupe
  ON public.price_drop_notifications (user_id, product_id, new_price);

CREATE INDEX IF NOT EXISTS idx_price_drop_notifications_user
  ON public.price_drop_notifications (user_id, created_at DESC);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS catalog_filter_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS shopper_interest_signals jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_drop_notifications TO service_role;

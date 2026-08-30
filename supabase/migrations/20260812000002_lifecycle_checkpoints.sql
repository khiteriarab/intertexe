-- Lifecycle checkpoint support: marketing preference columns (if missing)
-- + one-send-per-user unique indexes for Day 4 / 10 / 25 routers.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_preferences_marketing_subscribers
  ON public.user_preferences (marketing_emails, unsubscribed_at)
  WHERE marketing_emails = true AND unsubscribed_at IS NULL;

-- One lifecycle checkpoint email per user (pending/sent/delivered).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_lifecycle_day4_user
  ON public.email_deliveries (user_id)
  WHERE email_type = 'lifecycle_day4'
    AND user_id IS NOT NULL
    AND status IN ('pending', 'sent', 'delivered');

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_lifecycle_day10_user
  ON public.email_deliveries (user_id)
  WHERE email_type = 'lifecycle_day10'
    AND user_id IS NOT NULL
    AND status IN ('pending', 'sent', 'delivered');

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_lifecycle_day25_user
  ON public.email_deliveries (user_id)
  WHERE email_type = 'lifecycle_day25'
    AND user_id IS NOT NULL
    AND status IN ('pending', 'sent', 'delivered');

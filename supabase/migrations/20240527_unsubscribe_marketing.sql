-- Marketing email opt-out for weekly edit and Loops sync

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_preferences_marketing
  ON public.user_preferences (marketing_emails, unsubscribed_at)
  WHERE marketing_emails = true AND unsubscribed_at IS NULL;

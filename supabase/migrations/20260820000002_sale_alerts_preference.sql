-- Account-level INTERTEXE sale alerts (not a watch on an external retailer URL).

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS sale_alerts_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_alerts_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_alerts_source text,
  ADD COLUMN IF NOT EXISTS sale_alert_context jsonb;

CREATE INDEX IF NOT EXISTS idx_user_preferences_sale_alerts
  ON public.user_preferences (sale_alerts_enabled, unsubscribed_at)
  WHERE sale_alerts_enabled = true;

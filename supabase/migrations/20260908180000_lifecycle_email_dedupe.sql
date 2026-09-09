-- One lifecycle checkpoint per inbox (not just per user_id).
-- Prevents duplicate Day 4/10/25 sends when multiple auth rows share an email.

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_lifecycle_day4_email
  ON public.email_deliveries (lower(email))
  WHERE email_type = 'lifecycle_day4'
    AND status IN ('pending', 'sent', 'delivered');

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_lifecycle_day10_email
  ON public.email_deliveries (lower(email))
  WHERE email_type = 'lifecycle_day10'
    AND status IN ('pending', 'sent', 'delivered');

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_lifecycle_day25_email
  ON public.email_deliveries (lower(email))
  WHERE email_type = 'lifecycle_day25'
    AND status IN ('pending', 'sent', 'delivered');

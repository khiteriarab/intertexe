-- Track Gmail delivery failures (wrong / dead addresses) on hq_contacts.
-- Safe to re-run. Does not send email.

INSERT INTO public.hq_outreach_statuses (key, label, sort_order) VALUES
  ('undeliverable', 'Undeliverable', 75)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

ALTER TABLE public.hq_contacts
  ADD COLUMN IF NOT EXISTS last_bounced_at timestamptz;

COMMENT ON COLUMN public.hq_contacts.last_bounced_at IS
  'System. Latest Gmail bounce / DSN for this address.';

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.hq_contact_outreach'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.hq_contact_outreach DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.hq_contact_outreach
  ADD CONSTRAINT hq_contact_outreach_event_type_check
  CHECK (event_type IN (
    'email_sent',
    'email_reply_received',
    'follow_up_sent',
    'contact_imported',
    'account_created',
    'email_bounced'
  ));

CREATE INDEX IF NOT EXISTS hq_contact_outreach_bounce_idx
  ON public.hq_contact_outreach (received_at DESC)
  WHERE event_type = 'email_bounced';

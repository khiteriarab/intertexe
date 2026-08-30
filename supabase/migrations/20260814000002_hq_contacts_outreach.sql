-- Canonical outreach contacts + event log.
-- Reuses public.hq_contacts (created in 20260813). Does not create a second people table.
-- Safe to re-run. Does not scan catalog tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Ensure base HQ tables exist (20260813 may not have been applied / PostgREST-reloaded)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  concept text NOT NULL,
  hook text,
  platform text,
  filmed boolean NOT NULL DEFAULT false,
  edited boolean NOT NULL DEFAULT false,
  scheduled boolean NOT NULL DEFAULT false,
  posted boolean NOT NULL DEFAULT false,
  publish_at timestamptz,
  batch_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_content_items_workspace_publish_idx
  ON public.hq_content_items (workspace_id, publish_at NULLS LAST, created_at DESC);

CREATE TABLE IF NOT EXISTS public.hq_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  source text,
  campaign text,
  marketing_eligible boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  user_id uuid,
  notes text,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hq_contacts_workspace_email_key UNIQUE (workspace_id, email)
);

-- Cold outreach is not a marketing subscriber by default.
ALTER TABLE public.hq_contacts
  ALTER COLUMN marketing_eligible SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.hq_contact_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.hq_contact_types (key, label, sort_order) VALUES
  ('customer', 'Customer', 10),
  ('influencer', 'Influencer', 20),
  ('business', 'Business', 30),
  ('press', 'Press', 40),
  ('brand', 'Brand', 50),
  ('organization', 'Organization', 60),
  ('affiliate_partner', 'Affiliate partner', 70),
  ('investor', 'Investor', 80),
  ('other', 'Other', 90)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.hq_outreach_statuses (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.hq_outreach_statuses (key, label, sort_order) VALUES
  ('not_contacted', 'Not contacted', 10),
  ('contacted', 'Contacted', 20),
  ('replied', 'Replied', 30),
  ('interested', 'Interested', 40),
  ('follow_up_due', 'Follow-up due', 50),
  ('converted', 'Converted', 60),
  ('not_interested', 'Not interested', 70),
  ('dormant', 'Dormant', 80)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

ALTER TABLE public.hq_contacts
  ADD COLUMN IF NOT EXISTS normalized_email text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS contact_type text,
  ADD COLUMN IF NOT EXISTS outreach_status text,
  ADD COLUMN IF NOT EXISTS first_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS sheet_tab text;

UPDATE public.hq_contacts
SET normalized_email = lower(trim(email))
WHERE normalized_email IS NULL AND email IS NOT NULL;

UPDATE public.hq_contacts
SET full_name = NULLIF(trim(name), '')
WHERE full_name IS NULL AND name IS NOT NULL;

UPDATE public.hq_contacts
SET contact_type = 'customer'
WHERE contact_type IS NULL;

UPDATE public.hq_contacts
SET outreach_status = 'not_contacted'
WHERE outreach_status IS NULL;

ALTER TABLE public.hq_contacts
  ALTER COLUMN normalized_email SET NOT NULL,
  ALTER COLUMN contact_type SET DEFAULT 'customer',
  ALTER COLUMN outreach_status SET DEFAULT 'not_contacted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hq_contacts_contact_type_fkey'
  ) THEN
    ALTER TABLE public.hq_contacts
      ADD CONSTRAINT hq_contacts_contact_type_fkey
      FOREIGN KEY (contact_type) REFERENCES public.hq_contact_types(key);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hq_contacts_outreach_status_fkey'
  ) THEN
    ALTER TABLE public.hq_contacts
      ADD CONSTRAINT hq_contacts_outreach_status_fkey
      FOREIGN KEY (outreach_status) REFERENCES public.hq_outreach_statuses(key);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS hq_contacts_workspace_normalized_email_uidx
  ON public.hq_contacts (workspace_id, normalized_email);

CREATE INDEX IF NOT EXISTS hq_contacts_user_id_idx
  ON public.hq_contacts (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS hq_contacts_type_status_idx
  ON public.hq_contacts (workspace_id, contact_type, outreach_status);

CREATE OR REPLACE FUNCTION public.hq_contacts_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.normalized_email := NEW.email;
  IF NEW.full_name IS NULL OR trim(NEW.full_name) = '' THEN
    NEW.full_name := NULLIF(trim(concat_ws(' ', NEW.first_name, NEW.last_name)), '');
  END IF;
  IF NEW.full_name IS NULL THEN
    NEW.full_name := NULLIF(trim(NEW.name), '');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hq_contacts_normalize_email_trg ON public.hq_contacts;
CREATE TRIGGER hq_contacts_normalize_email_trg
  BEFORE INSERT OR UPDATE OF email, first_name, last_name, name
  ON public.hq_contacts
  FOR EACH ROW
  EXECUTE PROCEDURE public.hq_contacts_normalize_email();

-- ---------------------------------------------------------------------------
-- Outreach event log (not email_deliveries — that table is Resend/Loops product mail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_contact_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.hq_contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  channel text NOT NULL DEFAULT 'gmail'
    CHECK (channel IN ('gmail', 'loops', 'resend', 'system', 'other')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound', 'system')),
  provider text NOT NULL DEFAULT 'gmail',
  provider_message_id text,
  thread_id text,
  subject text,
  sent_at timestamptz,
  received_at timestamptz,
  event_type text NOT NULL
    CHECK (event_type IN (
      'email_sent',
      'email_reply_received',
      'follow_up_sent',
      'contact_imported',
      'account_created'
    )),
  campaign_id uuid REFERENCES public.hq_campaigns(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hq_contact_outreach_provider_msg_uidx
  ON public.hq_contact_outreach (provider, provider_message_id, contact_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS hq_contact_outreach_contact_idx
  ON public.hq_contact_outreach (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS hq_contact_outreach_sent_idx
  ON public.hq_contact_outreach (sent_at DESC)
  WHERE event_type IN ('email_sent', 'follow_up_sent');

CREATE INDEX IF NOT EXISTS hq_contact_outreach_reply_idx
  ON public.hq_contact_outreach (received_at DESC)
  WHERE event_type = 'email_reply_received';

-- ---------------------------------------------------------------------------
-- Gmail as a distinct OAuth provider (do not reuse GA/GSC google row)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.hq_oauth_connections DROP CONSTRAINT IF EXISTS hq_oauth_connections_provider_check;
  ALTER TABLE public.hq_oauth_connections
    ADD CONSTRAINT hq_oauth_connections_provider_check
    CHECK (provider IN (
      'google',
      'meta',
      'tiktok',
      'pinterest',
      'app_store_connect',
      'gmail'
    ));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'hq_oauth_connections provider check: %', SQLERRM;
END $$;

INSERT INTO public.hq_data_sources (workspace_id, key, label, status, sync_frequency)
SELECT w.id, 'gmail_outreach', 'Gmail outreach', 'not_connected', 'hourly'
FROM public.hq_workspaces w
WHERE w.slug = 'intertexe'
ON CONFLICT (workspace_id, key) DO NOTHING;

-- Configurable daily target + timezone (existing hq_metric_definitions)
INSERT INTO public.hq_metric_definitions (workspace_id, key, label, description, definition)
SELECT w.id, d.key, d.label, d.description, d.definition::jsonb
FROM public.hq_workspaces w
CROSS JOIN (VALUES
  (
    'outreach_daily_target',
    'Outreach daily target',
    'Qualified Gmail outreach emails per founder-local day',
    '{"value":25}'
  ),
  (
    'hq_business_timezone',
    'HQ business timezone',
    'IANA timezone for founder daily counts',
    '{"value":"Europe/Paris"}'
  )
) AS d(key, label, description, definition)
WHERE w.slug = 'intertexe'
ON CONFLICT (workspace_id, key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Signup matching (website + iOS). Email is the only identity key.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_link_contact_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws uuid;
  norm text;
BEGIN
  norm := lower(trim(COALESCE(NEW.email, '')));
  IF norm = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO ws FROM public.hq_workspaces WHERE slug = 'intertexe' LIMIT 1;
  IF ws IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.hq_contacts
  SET
    user_id = NEW.id,
    outreach_status = CASE
      WHEN outreach_status IN ('not_interested', 'dormant') THEN outreach_status
      ELSE 'converted'
    END,
    updated_at = now()
  WHERE workspace_id = ws
    AND user_id IS NULL
    AND normalized_email = norm;

  INSERT INTO public.hq_contact_outreach (
    contact_id, email, channel, direction, provider, event_type, metadata
  )
  SELECT
    c.id,
    c.email,
    'system',
    'system',
    'supabase',
    'account_created',
    jsonb_build_object('user_id', NEW.id)
  FROM public.hq_contacts c
  WHERE c.workspace_id = ws
    AND c.user_id = NEW.id
    AND c.normalized_email = norm
    AND NOT EXISTS (
      SELECT 1
      FROM public.hq_contact_outreach o
      WHERE o.contact_id = c.id
        AND o.event_type = 'account_created'
        AND o.metadata->>'user_id' = NEW.id::text
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hq_link_contact_on_signup_trg ON auth.users;
CREATE TRIGGER hq_link_contact_on_signup_trg
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.hq_link_contact_on_signup();

-- Link contacts to users who already exist (import / backfill).
CREATE OR REPLACE FUNCTION public.hq_link_existing_users_to_contacts(p_workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
  UPDATE public.hq_contacts c
  SET
    user_id = u.id,
    outreach_status = CASE
      WHEN c.outreach_status IN ('not_interested', 'dormant', 'converted') THEN c.outreach_status
      ELSE 'converted'
    END,
    updated_at = now()
  FROM auth.users u
  WHERE c.workspace_id = p_workspace_id
    AND c.user_id IS NULL
    AND c.normalized_email = lower(trim(u.email));

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- Daily progress (founder timezone, not UTC calendar)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_outreach_daily_progress(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text;
  target int;
  day_start timestamptz;
  day_end timestamptz;
  sent_today int;
  replies_today int;
  accounts_today int;
  follow_due int;
  by_customer int;
  by_influencer int;
  by_business int;
BEGIN
  SELECT COALESCE(definition->>'value', 'Europe/Paris')
  INTO tz
  FROM public.hq_metric_definitions
  WHERE workspace_id = p_workspace_id AND key = 'hq_business_timezone';
  tz := COALESCE(tz, 'Europe/Paris');

  SELECT COALESCE((definition->>'value')::int, 25)
  INTO target
  FROM public.hq_metric_definitions
  WHERE workspace_id = p_workspace_id AND key = 'outreach_daily_target';
  target := COALESCE(target, 25);

  day_start := date_trunc('day', timezone(tz, now())) AT TIME ZONE tz;
  day_end := day_start + interval '1 day';

  SELECT count(*)::int INTO sent_today
  FROM public.hq_contact_outreach o
  JOIN public.hq_contacts c ON c.id = o.contact_id
  WHERE c.workspace_id = p_workspace_id
    AND o.event_type IN ('email_sent', 'follow_up_sent')
    AND o.channel = 'gmail'
    AND o.sent_at >= day_start
    AND o.sent_at < day_end;

  SELECT count(*)::int INTO replies_today
  FROM public.hq_contact_outreach o
  JOIN public.hq_contacts c ON c.id = o.contact_id
  WHERE c.workspace_id = p_workspace_id
    AND o.event_type = 'email_reply_received'
    AND coalesce(o.received_at, o.created_at) >= day_start
    AND coalesce(o.received_at, o.created_at) < day_end;

  SELECT count(*)::int INTO accounts_today
  FROM public.hq_contact_outreach o
  JOIN public.hq_contacts c ON c.id = o.contact_id
  WHERE c.workspace_id = p_workspace_id
    AND o.event_type = 'account_created'
    AND o.created_at >= day_start
    AND o.created_at < day_end;

  SELECT count(*)::int INTO follow_due
  FROM public.hq_contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.next_follow_up_at IS NOT NULL
    AND c.next_follow_up_at <= now()
    AND c.outreach_status NOT IN ('converted', 'not_interested', 'dormant');

  SELECT
    count(*) FILTER (WHERE c.contact_type = 'customer')::int,
    count(*) FILTER (WHERE c.contact_type = 'influencer')::int,
    count(*) FILTER (WHERE c.contact_type = 'business')::int
  INTO by_customer, by_influencer, by_business
  FROM public.hq_contact_outreach o
  JOIN public.hq_contacts c ON c.id = o.contact_id
  WHERE c.workspace_id = p_workspace_id
    AND o.event_type IN ('email_sent', 'follow_up_sent')
    AND o.channel = 'gmail'
    AND o.sent_at >= day_start
    AND o.sent_at < day_end;

  RETURN jsonb_build_object(
    'sent_today', sent_today,
    'target_today', target,
    'remaining_today', GREATEST(target - sent_today, 0),
    'customer', by_customer,
    'influencer', by_influencer,
    'business', by_business,
    'replies_today', replies_today,
    'new_accounts_from_contacts_today', accounts_today,
    'follow_ups_due', follow_due,
    'timezone', tz,
    'day_start', day_start,
    'day_end', day_end
  );
END;
$$;

-- created_at alias: hq_contacts uses added_at historically
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hq_contacts' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.hq_contacts ADD COLUMN created_at timestamptz;
    UPDATE public.hq_contacts SET created_at = added_at WHERE created_at IS NULL;
    ALTER TABLE public.hq_contacts ALTER COLUMN created_at SET DEFAULT now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Read-only lifecycle overview. Behavioral metrics derived, never copied.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.hq_contact_overview AS
SELECT
  c.id,
  c.workspace_id,
  COALESCE(NULLIF(trim(c.full_name), ''), NULLIF(trim(c.name), ''), c.email) AS name,
  c.email,
  c.normalized_email,
  c.contact_type,
  c.company_name AS company,
  c.source,
  c.sheet_tab,
  c.outreach_status,
  c.marketing_eligible,
  c.first_contacted_at,
  c.last_contacted_at,
  c.last_replied_at,
  c.next_follow_up_at,
  (c.user_id IS NOT NULL) AS has_account,
  c.user_id,
  u.created_at AS signup_at,
  (
    SELECT min(s.scanned_at)
    FROM public.scan_history s
    WHERE c.user_id IS NOT NULL AND s.user_id::text = c.user_id::text
  ) AS first_app_activity_at,
  (
    SELECT max(s.scanned_at)
    FROM public.scan_history s
    WHERE c.user_id IS NOT NULL AND s.user_id::text = c.user_id::text
  ) AS last_app_activity_at,
  CASE
    WHEN c.user_id IS NULL THEN NULL
    ELSE (SELECT count(*)::int FROM public.scan_history s WHERE s.user_id::text = c.user_id::text)
  END AS scan_count,
  CASE
    WHEN c.user_id IS NULL THEN NULL
    ELSE (SELECT count(*)::int FROM public.user_saved_products p WHERE p.user_id::text = c.user_id::text)
  END AS save_count,
  CASE
    WHEN c.user_id IS NULL THEN NULL
    ELSE (
      SELECT (
        COALESCE((SELECT count(*) FROM public.user_product_clickouts x WHERE x.user_id::text = c.user_id::text), 0)
        + COALESCE((SELECT count(*) FROM public.scanner_clickouts x WHERE x.user_id::text = c.user_id::text), 0)
        + COALESCE((SELECT count(*) FROM public.editorial_clickouts x WHERE x.user_id::text = c.user_id::text), 0)
      )::int
    )
  END AS retailer_click_count,
  CASE
    WHEN c.user_id IS NULL THEN NULL
    ELSE (
      SELECT sum(t.commission_amount)
      FROM public.hq_affiliate_transactions t
      WHERE t.u1 = c.user_id::text
         OR t.raw->>'user_id' = c.user_id::text
    )
  END AS affiliate_revenue,
  c.notes,
  coalesce(c.created_at, c.added_at) AS created_at,
  c.updated_at
FROM public.hq_contacts c
LEFT JOIN auth.users u ON u.id = c.user_id;

-- ---------------------------------------------------------------------------
-- RLS: service_role only. No public enumeration.
-- ---------------------------------------------------------------------------
ALTER TABLE public.hq_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_contact_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_outreach_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_contact_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hq_service_all ON public.hq_contacts;
CREATE POLICY hq_service_all ON public.hq_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_content_items;
CREATE POLICY hq_service_all ON public.hq_content_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_contact_types;
CREATE POLICY hq_service_all ON public.hq_contact_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_outreach_statuses;
CREATE POLICY hq_service_all ON public.hq_outreach_statuses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_contact_outreach;
CREATE POLICY hq_service_all ON public.hq_contact_outreach
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.hq_contacts FROM anon, authenticated;
REVOKE ALL ON public.hq_contact_outreach FROM anon, authenticated;
REVOKE ALL ON public.hq_contact_overview FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_contact_outreach TO service_role;
GRANT SELECT ON public.hq_contact_types TO service_role;
GRANT SELECT ON public.hq_outreach_statuses TO service_role;
GRANT SELECT ON public.hq_contact_overview TO service_role;
GRANT EXECUTE ON FUNCTION public.hq_outreach_daily_progress(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.hq_link_existing_users_to_contacts(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

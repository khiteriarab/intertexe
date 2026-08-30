-- Lightweight BD operating layer on top of existing hq_contacts.
-- Complements Gmail / Loops / Resend. Does not send email. No catalog joins.

-- ---------------------------------------------------------------------------
-- Taxonomies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_contact_sources (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.hq_contact_sources (key, label, sort_order) VALUES
  ('founder_network', 'Founder network', 10),
  ('tiktok', 'TikTok', 20),
  ('instagram', 'Instagram', 30),
  ('event', 'Event', 40),
  ('press_research', 'Press research', 50),
  ('creator_research', 'Creator research', 60),
  ('brand_research', 'Brand research', 70),
  ('organization_outreach', 'Organization outreach', 80),
  ('referral', 'Referral', 90),
  ('google_sheet_legacy', 'Google Sheet (legacy)', 100),
  ('inbound', 'Inbound', 110)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.hq_relationship_statuses (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.hq_relationship_statuses (key, label, sort_order) VALUES
  ('prospect', 'Prospect', 10),
  ('contacted', 'Contacted', 20),
  ('engaged', 'Engaged', 30),
  ('partner', 'Partner', 40),
  ('inactive', 'Inactive', 50)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.hq_next_action_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.hq_next_action_types (key, label, sort_order) VALUES
  ('INTRODUCTION', 'Introduction', 10),
  ('FOLLOW_UP_1', 'Follow-up 1', 20),
  ('FOLLOW_UP_2', 'Follow-up 2', 30),
  ('WAIT', 'Wait', 40),
  ('HUMAN_REPLY', 'Human reply', 50),
  ('CONVERTED', 'Converted', 60),
  ('HIGH_VALUE_RELATIONSHIP', 'High-value relationship', 70),
  ('NONE', 'None', 80)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

ALTER TABLE public.hq_contacts
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS relationship_status text,
  ADD COLUMN IF NOT EXISTS next_action_type text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority_score integer,
  ADD COLUMN IF NOT EXISTS next_action_reason text;

-- Preserve raw origin, then map source onto the taxonomy.
UPDATE public.hq_contacts
SET source_detail = COALESCE(
  NULLIF(trim(source_detail), ''),
  NULLIF(trim(sheet_tab), ''),
  NULLIF(trim(source), '')
)
WHERE source_detail IS NULL;

UPDATE public.hq_contacts
SET source = CASE
  WHEN lower(trim(coalesce(source, ''))) IN ('xlsx_import', 'google_sheet', 'sheet', 'spreadsheet', 'google_sheet_legacy')
    THEN 'google_sheet_legacy'
  WHEN lower(trim(coalesce(source, ''))) IN ('gmail_signoff', 'founder', 'founder_network', 'personal')
    THEN 'founder_network'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%tiktok%' THEN 'tiktok'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%instagram%' OR lower(trim(coalesce(source, ''))) IN ('ig', 'insta')
    THEN 'instagram'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%event%' THEN 'event'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%press%' THEN 'press_research'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%creator%' THEN 'creator_research'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%brand%' THEN 'brand_research'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%org%' THEN 'organization_outreach'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%refer%' THEN 'referral'
  WHEN lower(trim(coalesce(source, ''))) LIKE '%inbound%' THEN 'inbound'
  WHEN source IS NULL OR trim(source) = '' THEN
    CASE WHEN sheet_tab IS NOT NULL THEN 'google_sheet_legacy' ELSE 'founder_network' END
  ELSE 'google_sheet_legacy'
END
WHERE source IS NULL
   OR source NOT IN (
     SELECT key FROM public.hq_contact_sources
   );

UPDATE public.hq_contacts
SET relationship_status = 'prospect'
WHERE relationship_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hq_contacts_source_fkey') THEN
    ALTER TABLE public.hq_contacts
      ADD CONSTRAINT hq_contacts_source_fkey
      FOREIGN KEY (source) REFERENCES public.hq_contact_sources(key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hq_contacts_relationship_status_fkey') THEN
    ALTER TABLE public.hq_contacts
      ADD CONSTRAINT hq_contacts_relationship_status_fkey
      FOREIGN KEY (relationship_status) REFERENCES public.hq_relationship_statuses(key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hq_contacts_next_action_type_fkey') THEN
    ALTER TABLE public.hq_contacts
      ADD CONSTRAINT hq_contacts_next_action_type_fkey
      FOREIGN KEY (next_action_type) REFERENCES public.hq_next_action_types(key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS hq_contacts_next_action_idx
  ON public.hq_contacts (workspace_id, next_action_type, next_action_at)
  WHERE next_action_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS hq_contacts_source_idx
  ON public.hq_contacts (workspace_id, source);

CREATE INDEX IF NOT EXISTS hq_contacts_relationship_idx
  ON public.hq_contacts (workspace_id, relationship_status);

COMMENT ON COLUMN public.hq_contacts.source IS 'Controlled origin taxonomy. Manual.';
COMMENT ON COLUMN public.hq_contacts.source_detail IS 'Optional origin detail (tab, event name, handle). Manual.';
COMMENT ON COLUMN public.hq_contacts.relationship_status IS 'System. Who they are to INTERTEXE (not outreach status, not contact type).';
COMMENT ON COLUMN public.hq_contacts.next_action_type IS 'System-derived. HQ never auto-sends.';
COMMENT ON COLUMN public.hq_contacts.next_action_at IS 'System-derived due time.';
COMMENT ON COLUMN public.hq_contacts.priority_score IS 'System-derived 0–100.';
COMMENT ON COLUMN public.hq_contacts.next_action_reason IS 'System. Why this action.';

INSERT INTO public.hq_metric_definitions (workspace_id, key, label, description, definition)
SELECT w.id, d.key, d.label, d.description, d.definition::jsonb
FROM public.hq_workspaces w
CROSS JOIN (VALUES
  ('outreach_followup_1_days', 'Follow-up 1 delay', 'Days after first Gmail send before FOLLOW_UP_1', '{"value":4}'),
  ('outreach_followup_2_days', 'Follow-up 2 delay', 'Days after last send before FOLLOW_UP_2', '{"value":7}')
) AS d(key, label, description, definition)
WHERE w.slug = 'intertexe'
ON CONFLICT (workspace_id, key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Derived next action. Humans send; the system remembers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_refresh_contact_bd_state(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.hq_contacts%ROWTYPE;
  send_n int;
  scan_n int;
  follow1 interval;
  follow2 interval;
  rel text;
  act text;
  act_at timestamptz;
  score int;
  reason text;
  follow_at timestamptz;
BEGIN
  SELECT * INTO c FROM public.hq_contacts WHERE id = p_contact_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE((definition->>'value')::int, 4) * interval '1 day'
  INTO follow1
  FROM public.hq_metric_definitions
  WHERE workspace_id = c.workspace_id AND key = 'outreach_followup_1_days';
  follow1 := COALESCE(follow1, interval '4 days');

  SELECT COALESCE((definition->>'value')::int, 7) * interval '1 day'
  INTO follow2
  FROM public.hq_metric_definitions
  WHERE workspace_id = c.workspace_id AND key = 'outreach_followup_2_days';
  follow2 := COALESCE(follow2, interval '7 days');

  SELECT count(*)::int INTO send_n
  FROM public.hq_contact_outreach
  WHERE contact_id = c.id
    AND event_type IN ('email_sent', 'follow_up_sent');

  IF c.user_id IS NULL THEN
    scan_n := 0;
  ELSE
    SELECT count(*)::int INTO scan_n
    FROM public.scan_history s
    WHERE s.user_id::text = c.user_id::text;
  END IF;

  IF c.outreach_status IN ('not_interested', 'dormant') THEN
    rel := 'inactive';
    act := 'NONE';
    act_at := NULL;
    score := 0;
    reason := 'Marked inactive';
  ELSIF c.user_id IS NOT NULL AND scan_n >= 2 THEN
    rel := 'partner';
    act := 'HIGH_VALUE_RELATIONSHIP';
    act_at := now();
    score := 90;
    reason := 'Account + repeated scans';
  ELSIF c.user_id IS NOT NULL THEN
    rel := 'partner';
    act := 'CONVERTED';
    act_at := NULL;
    score := 25;
    reason := 'Created INTERTEXE account';
  ELSIF c.last_replied_at IS NOT NULL
        AND (c.last_contacted_at IS NULL OR c.last_replied_at >= c.last_contacted_at) THEN
    rel := 'engaged';
    act := 'HUMAN_REPLY';
    act_at := c.last_replied_at;
    score := 95;
    reason := 'Replied — founder should respond in Gmail';
  ELSIF c.last_contacted_at IS NULL THEN
    rel := 'prospect';
    act := 'INTRODUCTION';
    act_at := COALESCE(c.added_at, c.created_at, now());
    score := CASE c.contact_type
      WHEN 'influencer' THEN 78
      WHEN 'organization' THEN 76
      WHEN 'brand' THEN 74
      WHEN 'press' THEN 72
      ELSE 70
    END;
    reason := 'Never contacted';
  ELSIF send_n <= 1 THEN
    rel := 'contacted';
    act_at := c.last_contacted_at + follow1;
    IF now() >= act_at THEN
      act := 'FOLLOW_UP_1';
      score := 60;
      reason := 'No reply 4+ days after first email';
    ELSE
      act := 'WAIT';
      score := 40;
      reason := 'Waiting for first-email window';
    END IF;
  ELSE
    rel := 'contacted';
    act_at := c.last_contacted_at + follow2;
    IF now() >= act_at THEN
      act := 'FOLLOW_UP_2';
      score := 50;
      reason := 'No reply 7+ days after last email';
    ELSE
      act := 'WAIT';
      score := 35;
      reason := 'Waiting for follow-up window';
    END IF;
  END IF;

  IF act IN ('FOLLOW_UP_1', 'FOLLOW_UP_2') THEN
    follow_at := act_at;
  ELSE
    follow_at := NULL;
  END IF;

  UPDATE public.hq_contacts
  SET
    relationship_status = rel,
    next_action_type = act,
    next_action_at = act_at,
    priority_score = score,
    next_action_reason = reason,
    next_follow_up_at = follow_at,
    updated_at = now()
  WHERE id = c.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_refresh_workspace_bd_state(p_workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.hq_contacts WHERE workspace_id = p_workspace_id
  LOOP
    PERFORM public.hq_refresh_contact_bd_state(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_contact_bd_state_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'hq_contact_outreach' THEN
    PERFORM public.hq_refresh_contact_bd_state(NEW.contact_id);
  ELSE
    PERFORM public.hq_refresh_contact_bd_state(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hq_contact_outreach_bd_trg ON public.hq_contact_outreach;
CREATE TRIGGER hq_contact_outreach_bd_trg
  AFTER INSERT ON public.hq_contact_outreach
  FOR EACH ROW
  EXECUTE PROCEDURE public.hq_contact_bd_state_trg();

DROP TRIGGER IF EXISTS hq_contacts_bd_trg ON public.hq_contacts;
CREATE TRIGGER hq_contacts_bd_trg
  AFTER INSERT OR UPDATE OF user_id, last_contacted_at, last_replied_at, outreach_status, contact_type
  ON public.hq_contacts
  FOR EACH ROW
  EXECUTE PROCEDURE public.hq_contact_bd_state_trg();

-- ---------------------------------------------------------------------------
-- Studio overview: add BD fields. Same small-table joins as before.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.hq_contact_overview;

CREATE OR REPLACE VIEW public.hq_contact_overview AS
SELECT
  c.id,
  c.workspace_id,
  COALESCE(NULLIF(trim(c.full_name), ''), NULLIF(trim(c.name), ''), c.email) AS name,
  c.email,
  c.normalized_email,
  c.contact_type,
  c.relationship_status,
  c.company_name AS company,
  c.source,
  c.source_detail,
  c.sheet_tab,
  c.website,
  c.instagram,
  c.tiktok,
  c.city,
  c.country,
  c.outreach_status,
  c.next_action_type,
  c.next_action_at,
  c.priority_score,
  c.next_action_reason,
  c.marketing_eligible,
  c.first_contacted_at,
  c.last_contacted_at,
  c.last_replied_at,
  c.next_follow_up_at,
  (c.user_id IS NOT NULL) AS has_account,
  c.user_id,
  c.account_created_at,
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
    WHEN c.user_id IS NULL THEN false
    ELSE EXISTS (SELECT 1 FROM public.scan_history s WHERE s.user_id::text = c.user_id::text)
  END AS has_scanned,
  CASE
    WHEN c.user_id IS NULL THEN NULL
    ELSE (SELECT count(*)::int FROM public.scan_history s WHERE s.user_id::text = c.user_id::text)
  END AS scan_count,
  CASE
    WHEN c.user_id IS NULL THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_saved_products p WHERE p.user_id::text = c.user_id::text)
  END AS has_saved,
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
  CASE
    WHEN c.account_created_at IS NULL OR c.last_contacted_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (c.account_created_at - c.last_contacted_at)) / 86400.0
  END AS days_contact_to_signup,
  c.notes,
  coalesce(c.created_at, c.added_at) AS created_at,
  c.updated_at
FROM public.hq_contacts c
LEFT JOIN auth.users u ON u.id = c.user_id;

-- ---------------------------------------------------------------------------
-- Founder Today: keep existing acquisition metrics, add BD intelligence.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_founder_today(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  tz text;
  target int;
  day_start timestamptz;
  day_end timestamptz;
  d7 timestamptz;
  d30 timestamptz;
  y_start timestamptz;
  out jsonb;
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
  y_start := day_start - interval '1 day';
  d7 := day_start - interval '7 days';
  d30 := day_start - interval '30 days';

  WITH first_scans AS (
    SELECT s.user_id::text AS uid, min(s.scanned_at) AS first_at, count(*)::int AS scan_n
    FROM public.scan_history s
    WHERE s.user_id IS NOT NULL
    GROUP BY 1
  ),
  click_users AS (
    SELECT user_id::text AS uid FROM public.user_product_clickouts WHERE user_id IS NOT NULL
    UNION
    SELECT user_id::text FROM public.scanner_clickouts WHERE user_id IS NOT NULL
    UNION
    SELECT user_id::text FROM public.editorial_clickouts WHERE user_id IS NOT NULL
  )
  SELECT jsonb_build_object(
    'timezone', tz,
    'day_start', day_start,
    'day_end', day_end,
    'activation_definition', 'first_scan',
    'accounts', jsonb_build_object(
      'today', (SELECT count(*)::int FROM auth.users u WHERE u.created_at >= day_start AND u.created_at < day_end),
      'd7', (SELECT count(*)::int FROM auth.users u WHERE u.created_at >= d7 AND u.created_at < day_end),
      'd30', (SELECT count(*)::int FROM auth.users u WHERE u.created_at >= d30 AND u.created_at < day_end),
      'total', (SELECT count(*)::int FROM auth.users)
    ),
    'activated', jsonb_build_object(
      'today', (SELECT count(*)::int FROM first_scans f WHERE f.first_at >= day_start AND f.first_at < day_end),
      'd7', (SELECT count(*)::int FROM first_scans f WHERE f.first_at >= d7 AND f.first_at < day_end),
      'd30', (SELECT count(*)::int FROM first_scans f WHERE f.first_at >= d30 AND f.first_at < day_end),
      'total', (SELECT count(*)::int FROM first_scans)
    ),
    'scans', jsonb_build_object(
      'today', (SELECT count(*)::int FROM public.scan_history s WHERE s.scanned_at >= day_start AND s.scanned_at < day_end),
      'd7', (SELECT count(*)::int FROM public.scan_history s WHERE s.scanned_at >= d7 AND s.scanned_at < day_end)
    ),
    'clicks', jsonb_build_object(
      'today', (
        (SELECT count(*)::int FROM public.user_product_clickouts x WHERE x.clicked_at >= day_start AND x.clicked_at < day_end)
        + (SELECT count(*)::int FROM public.scanner_clickouts x WHERE x.clicked_at >= day_start AND x.clicked_at < day_end)
        + (SELECT count(*)::int FROM public.editorial_clickouts x WHERE x.clicked_at >= day_start AND x.clicked_at < day_end)
      ),
      'd7', (
        (SELECT count(*)::int FROM public.user_product_clickouts x WHERE x.clicked_at >= d7 AND x.clicked_at < day_end)
        + (SELECT count(*)::int FROM public.scanner_clickouts x WHERE x.clicked_at >= d7 AND x.clicked_at < day_end)
        + (SELECT count(*)::int FROM public.editorial_clickouts x WHERE x.clicked_at >= d7 AND x.clicked_at < day_end)
      ),
      'd30', (
        (SELECT count(*)::int FROM public.user_product_clickouts x WHERE x.clicked_at >= d30 AND x.clicked_at < day_end)
        + (SELECT count(*)::int FROM public.scanner_clickouts x WHERE x.clicked_at >= d30 AND x.clicked_at < day_end)
        + (SELECT count(*)::int FROM public.editorial_clickouts x WHERE x.clicked_at >= d30 AND x.clicked_at < day_end)
      )
    ),
    'follow_ups_due', (
      SELECT count(*)::int FROM public.hq_contacts c
      WHERE c.workspace_id = p_workspace_id
        AND c.next_action_type IN ('FOLLOW_UP_1', 'FOLLOW_UP_2')
        AND c.next_action_at IS NOT NULL
        AND c.next_action_at <= now()
    ),
    'accounts_from_contacts_today', (
      SELECT count(*)::int FROM public.hq_contacts c
      WHERE c.workspace_id = p_workspace_id
        AND c.account_created_at >= day_start AND c.account_created_at < day_end
    ),
    'activated_from_contacts_today', (
      SELECT count(*)::int
      FROM public.hq_contacts c
      JOIN first_scans f ON f.uid = c.user_id::text
      WHERE c.workspace_id = p_workspace_id
        AND c.user_id IS NOT NULL
        AND f.first_at >= day_start AND f.first_at < day_end
    ),
    'outreach', (
      SELECT jsonb_build_object(
        'sent_today', count(*) FILTER (WHERE o.event_type IN ('email_sent','follow_up_sent') AND o.channel='gmail' AND o.sent_at >= day_start AND o.sent_at < day_end),
        'target_today', target,
        'remaining_today', GREATEST(target - count(*) FILTER (WHERE o.event_type IN ('email_sent','follow_up_sent') AND o.channel='gmail' AND o.sent_at >= day_start AND o.sent_at < day_end), 0),
        'customer', count(*) FILTER (WHERE o.event_type IN ('email_sent','follow_up_sent') AND o.channel='gmail' AND o.sent_at >= day_start AND o.sent_at < day_end AND c.contact_type='customer'),
        'influencer', count(*) FILTER (WHERE o.event_type IN ('email_sent','follow_up_sent') AND o.channel='gmail' AND o.sent_at >= day_start AND o.sent_at < day_end AND c.contact_type='influencer'),
        'business', count(*) FILTER (WHERE o.event_type IN ('email_sent','follow_up_sent') AND o.channel='gmail' AND o.sent_at >= day_start AND o.sent_at < day_end AND c.contact_type='business'),
        'brand', count(*) FILTER (WHERE o.event_type IN ('email_sent','follow_up_sent') AND o.channel='gmail' AND o.sent_at >= day_start AND o.sent_at < day_end AND c.contact_type='brand'),
        'replies_today', count(*) FILTER (WHERE o.event_type='email_reply_received' AND coalesce(o.received_at,o.created_at) >= day_start AND coalesce(o.received_at,o.created_at) < day_end)
      )
      FROM public.hq_contact_outreach o
      JOIN public.hq_contacts c ON c.id = o.contact_id
      WHERE c.workspace_id = p_workspace_id
    ),
    'funnel', (
      SELECT jsonb_build_object(
        'imported', count(*)::int,
        'emailed', count(*) FILTER (WHERE last_contacted_at IS NOT NULL)::int,
        'replied', count(*) FILTER (WHERE last_replied_at IS NOT NULL)::int,
        'accounts', count(*) FILTER (WHERE user_id IS NOT NULL)::int,
        'activated', count(*) FILTER (
          WHERE user_id IS NOT NULL AND EXISTS (SELECT 1 FROM first_scans f WHERE f.uid = c.user_id::text)
        )::int,
        'retailer_clicked', count(*) FILTER (
          WHERE user_id IS NOT NULL AND EXISTS (SELECT 1 FROM click_users k WHERE k.uid = c.user_id::text)
        )::int,
        'contacted_became_users', count(*) FILTER (WHERE last_contacted_at IS NOT NULL AND user_id IS NOT NULL)::int
      )
      FROM public.hq_contacts c
      WHERE c.workspace_id = p_workspace_id
    ),
    'by_type', (
      SELECT coalesce(jsonb_object_agg(contact_type, row_to_json(t)::jsonb), '{}'::jsonb)
      FROM (
        SELECT
          c.contact_type,
          count(*) FILTER (WHERE c.last_contacted_at IS NOT NULL)::int AS contacted,
          count(*) FILTER (WHERE c.last_replied_at IS NOT NULL)::int AS replied,
          count(*) FILTER (WHERE c.user_id IS NOT NULL)::int AS accounts,
          count(*) FILTER (
            WHERE c.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM first_scans f WHERE f.uid = c.user_id::text)
          )::int AS activated
        FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
          AND c.contact_type IN ('customer','influencer','business','brand','press','organization')
        GROUP BY c.contact_type
      ) t
    ),
    'bd', jsonb_build_object(
      'introductions_due', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id AND c.next_action_type = 'INTRODUCTION'
      ),
      'follow_ups_due', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
          AND c.next_action_type IN ('FOLLOW_UP_1','FOLLOW_UP_2')
          AND c.next_action_at <= now()
      ),
      'replies_need_attention', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id AND c.next_action_type = 'HUMAN_REPLY'
      ),
      'high_value_attention', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id AND c.next_action_type = 'HIGH_VALUE_RELATIONSHIP'
      ),
      'week_contacted', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
          AND c.last_contacted_at >= d7 AND c.last_contacted_at < day_end
      ),
      'week_replies', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
          AND c.last_replied_at >= d7 AND c.last_replied_at < day_end
      ),
      'week_accounts', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
          AND c.account_created_at >= d7 AND c.account_created_at < day_end
      ),
      'week_activated', (
        SELECT count(*)::int
        FROM public.hq_contacts c
        JOIN first_scans f ON f.uid = c.user_id::text
        WHERE c.workspace_id = p_workspace_id
          AND f.first_at >= d7 AND f.first_at < day_end
      ),
      'yesterday_sent', (
        SELECT count(*)::int FROM public.hq_contact_outreach o
        JOIN public.hq_contacts c ON c.id = o.contact_id
        WHERE c.workspace_id = p_workspace_id
          AND o.event_type IN ('email_sent','follow_up_sent') AND o.channel = 'gmail'
          AND o.sent_at >= y_start AND o.sent_at < day_start
      ),
      'yesterday_replies', (
        SELECT count(*)::int FROM public.hq_contact_outreach o
        JOIN public.hq_contacts c ON c.id = o.contact_id
        WHERE c.workspace_id = p_workspace_id
          AND o.event_type = 'email_reply_received'
          AND coalesce(o.received_at, o.created_at) >= y_start
          AND coalesce(o.received_at, o.created_at) < day_start
      ),
      'yesterday_registrations', (
        SELECT count(*)::int FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
          AND c.account_created_at >= y_start AND c.account_created_at < day_start
      ),
      'opportunities', (
        SELECT jsonb_build_object(
          'influencer', count(*) FILTER (WHERE contact_type = 'influencer')::int,
          'brand', count(*) FILTER (WHERE contact_type = 'brand')::int,
          'organization', count(*) FILTER (WHERE contact_type = 'organization')::int,
          'press', count(*) FILTER (WHERE contact_type = 'press')::int
        )
        FROM public.hq_contacts
        WHERE workspace_id = p_workspace_id
          AND next_action_type = 'HUMAN_REPLY'
      ),
      'intro_queue', (
        SELECT jsonb_build_object(
          'influencer', count(*) FILTER (WHERE contact_type = 'influencer')::int,
          'customer', count(*) FILTER (WHERE contact_type = 'customer')::int,
          'brand', count(*) FILTER (WHERE contact_type = 'brand')::int,
          'business', count(*) FILTER (WHERE contact_type = 'business')::int,
          'organization', count(*) FILTER (WHERE contact_type = 'organization')::int,
          'press', count(*) FILTER (WHERE contact_type = 'press')::int
        )
        FROM public.hq_contacts
        WHERE workspace_id = p_workspace_id AND next_action_type = 'INTRODUCTION'
      ),
      'canonical_funnel', (
        SELECT jsonb_build_object(
          'discovered', count(*)::int,
          'targeted', count(*) FILTER (WHERE coalesce(relationship_status,'prospect') <> 'inactive')::int,
          'contacted', count(*) FILTER (WHERE last_contacted_at IS NOT NULL)::int,
          'engaged', count(*) FILTER (WHERE last_replied_at IS NOT NULL)::int,
          'acquired', count(*) FILTER (WHERE user_id IS NOT NULL)::int,
          'activated', count(*) FILTER (
            WHERE user_id IS NOT NULL AND EXISTS (SELECT 1 FROM first_scans f WHERE f.uid = c.user_id::text)
          )::int,
          'engaged_user', count(*) FILTER (
            WHERE user_id IS NOT NULL AND EXISTS (SELECT 1 FROM first_scans f WHERE f.uid = c.user_id::text AND f.scan_n >= 2)
          )::int,
          'commercial', count(*) FILTER (
            WHERE user_id IS NOT NULL AND EXISTS (SELECT 1 FROM click_users k WHERE k.uid = c.user_id::text)
          )::int
        )
        FROM public.hq_contacts c
        WHERE c.workspace_id = p_workspace_id
      ),
      'by_source', (
        SELECT coalesce(jsonb_agg(row_to_json(s) ORDER BY s.contacted DESC, s.discovered DESC), '[]'::jsonb)
        FROM (
          SELECT
            c.source,
            count(*)::int AS discovered,
            count(*) FILTER (WHERE c.last_contacted_at IS NOT NULL)::int AS contacted,
            count(*) FILTER (WHERE c.last_replied_at IS NOT NULL)::int AS replied,
            count(*) FILTER (WHERE c.user_id IS NOT NULL)::int AS accounts,
            count(*) FILTER (
              WHERE c.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM first_scans f WHERE f.uid = c.user_id::text)
            )::int AS activated
          FROM public.hq_contacts c
          WHERE c.workspace_id = p_workspace_id
          GROUP BY c.source
        ) s
      )
    )
  ) INTO out;

  RETURN out;
END;
$$;

GRANT SELECT ON public.hq_contact_sources TO service_role;
GRANT SELECT ON public.hq_relationship_statuses TO service_role;
GRANT SELECT ON public.hq_next_action_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_contact_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_relationship_statuses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_next_action_types TO service_role;
GRANT SELECT ON public.hq_contact_overview TO service_role;
REVOKE ALL ON public.hq_contact_overview FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hq_refresh_contact_bd_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.hq_refresh_workspace_bd_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.hq_founder_today(uuid) TO service_role;

ALTER TABLE public.hq_contact_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_relationship_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_next_action_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hq_service_all ON public.hq_contact_sources;
CREATE POLICY hq_service_all ON public.hq_contact_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hq_service_all ON public.hq_relationship_statuses;
CREATE POLICY hq_service_all ON public.hq_relationship_statuses FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hq_service_all ON public.hq_next_action_types;
CREATE POLICY hq_service_all ON public.hq_next_action_types FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Backfill derived fields for existing contacts (212-scale).
SELECT public.hq_refresh_workspace_bd_state(id)
FROM public.hq_workspaces
WHERE slug = 'intertexe';

NOTIFY pgrst, 'reload schema';

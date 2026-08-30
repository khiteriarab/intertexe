-- One-time contact Studio fields + required account-creation tracking.
-- Does not scan catalog tables. Safe to re-run.

ALTER TABLE public.hq_contacts
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS account_created_at timestamptz;

COMMENT ON TABLE public.hq_contacts IS
  'Canonical INTERTEXE people. Add/edit in Table Editor. HQ is reporting only. marketing_eligible stays false for cold outreach.';
COMMENT ON COLUMN public.hq_contacts.email IS 'Manual. Unique per workspace after normalize.';
COMMENT ON COLUMN public.hq_contacts.first_name IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.last_name IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.company_name IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.contact_type IS 'Manual. FK to hq_contact_types (Studio dropdown).';
COMMENT ON COLUMN public.hq_contacts.source IS 'Manual origin (xlsx_import, gmail_signoff, etc).';
COMMENT ON COLUMN public.hq_contacts.website IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.phone IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.instagram IS 'Manual handle or URL.';
COMMENT ON COLUMN public.hq_contacts.tiktok IS 'Manual handle or URL.';
COMMENT ON COLUMN public.hq_contacts.city IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.country IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.notes IS 'Manual.';
COMMENT ON COLUMN public.hq_contacts.user_id IS 'System. Linked INTERTEXE auth user.';
COMMENT ON COLUMN public.hq_contacts.account_created_at IS 'System. Signup time of linked user (converted_to_user_at).';
COMMENT ON COLUMN public.hq_contacts.outreach_status IS 'System. FK to hq_outreach_statuses.';
COMMENT ON COLUMN public.hq_contacts.first_contacted_at IS 'System. First qualifying Gmail send.';
COMMENT ON COLUMN public.hq_contacts.last_contacted_at IS 'System. Latest qualifying Gmail send.';
COMMENT ON COLUMN public.hq_contacts.last_replied_at IS 'System. Latest qualifying Gmail reply.';
COMMENT ON COLUMN public.hq_contacts.next_follow_up_at IS 'System.';
COMMENT ON COLUMN public.hq_contacts.marketing_eligible IS 'Not implied by cold outreach. Default false.';

-- Backfill account_created_at from auth.users when already linked.
UPDATE public.hq_contacts c
SET account_created_at = u.created_at
FROM auth.users u
WHERE c.user_id = u.id
  AND c.account_created_at IS NULL;

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
    account_created_at = COALESCE(account_created_at, NEW.created_at, now()),
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
    account_created_at = COALESCE(c.account_created_at, u.created_at),
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
    jsonb_build_object('user_id', c.user_id, 'backfill', true)
  FROM public.hq_contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.hq_contact_outreach o
      WHERE o.contact_id = c.id AND o.event_type = 'account_created'
    );

  RETURN n;
END;
$$;

DROP VIEW IF EXISTS public.hq_contact_overview;

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
  c.website,
  c.instagram,
  c.tiktok,
  c.city,
  c.country,
  c.outreach_status,
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

-- Lifetime funnel. hq_contacts + user-keyed activity only. No catalog/product joins.
CREATE OR REPLACE FUNCTION public.hq_outreach_funnel(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  imported int;
  emailed int;
  replied int;
  accounts int;
  scanned int;
  clicked int;
  customer_accounts int;
  influencer_accounts int;
  business_accounts int;
  brand_accounts int;
  contacted_accounts int;
  emailed_n int;
  avg_days numeric;
BEGIN
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE last_contacted_at IS NOT NULL)::int,
    count(*) FILTER (WHERE last_replied_at IS NOT NULL)::int,
    count(*) FILTER (WHERE user_id IS NOT NULL)::int,
    count(*) FILTER (WHERE contact_type = 'customer' AND user_id IS NOT NULL)::int,
    count(*) FILTER (WHERE contact_type = 'influencer' AND user_id IS NOT NULL)::int,
    count(*) FILTER (WHERE contact_type = 'business' AND user_id IS NOT NULL)::int,
    count(*) FILTER (WHERE contact_type = 'brand' AND user_id IS NOT NULL)::int,
    count(*) FILTER (WHERE last_contacted_at IS NOT NULL AND user_id IS NOT NULL)::int,
    avg(EXTRACT(EPOCH FROM (account_created_at - last_contacted_at)) / 86400.0)
      FILTER (WHERE account_created_at IS NOT NULL AND last_contacted_at IS NOT NULL)
  INTO imported, emailed, replied, accounts, customer_accounts, influencer_accounts,
       business_accounts, brand_accounts, contacted_accounts, avg_days
  FROM public.hq_contacts
  WHERE workspace_id = p_workspace_id;

  emailed_n := emailed;

  SELECT count(*)::int INTO scanned
  FROM public.hq_contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.scan_history s
      WHERE s.user_id::text = c.user_id::text
    );

  SELECT count(*)::int INTO clicked
  FROM public.hq_contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.user_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.user_product_clickouts x WHERE x.user_id::text = c.user_id::text)
      OR EXISTS (SELECT 1 FROM public.scanner_clickouts x WHERE x.user_id::text = c.user_id::text)
      OR EXISTS (SELECT 1 FROM public.editorial_clickouts x WHERE x.user_id::text = c.user_id::text)
    );

  RETURN jsonb_build_object(
    'imported', imported,
    'emailed', emailed,
    'replied', replied,
    'accounts', accounts,
    'scanned', scanned,
    'retailer_clicked', clicked,
    'customer_accounts', customer_accounts,
    'influencer_accounts', influencer_accounts,
    'business_accounts', business_accounts,
    'brand_accounts', brand_accounts,
    'contacted_became_users', contacted_accounts,
    'contacted_to_account_rate',
      CASE WHEN emailed_n = 0 THEN NULL ELSE round((contacted_accounts::numeric / emailed_n) * 1000) / 10 END,
    'imported_to_account_rate',
      CASE WHEN imported = 0 THEN NULL ELSE round((accounts::numeric / imported) * 1000) / 10 END,
    'avg_days_contact_to_signup', CASE WHEN avg_days IS NULL THEN NULL ELSE round(avg_days * 10) / 10 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hq_outreach_funnel(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.hq_link_existing_users_to_contacts(uuid) TO service_role;
GRANT SELECT ON public.hq_contact_overview TO service_role;
REVOKE ALL ON public.hq_contact_overview FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.hq_contact_types FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.hq_outreach_statuses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_contact_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_outreach_statuses TO service_role;

-- Daily 25: signup timestamp (not backfill event time). Include brand sends.
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
  by_brand int;
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
  FROM public.hq_contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.account_created_at >= day_start
    AND c.account_created_at < day_end;

  SELECT count(*)::int INTO follow_due
  FROM public.hq_contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.next_follow_up_at IS NOT NULL
    AND c.next_follow_up_at <= now()
    AND c.outreach_status NOT IN ('converted', 'not_interested', 'dormant');

  SELECT
    count(*) FILTER (WHERE c.contact_type = 'customer')::int,
    count(*) FILTER (WHERE c.contact_type = 'influencer')::int,
    count(*) FILTER (WHERE c.contact_type = 'business')::int,
    count(*) FILTER (WHERE c.contact_type = 'brand')::int
  INTO by_customer, by_influencer, by_business, by_brand
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
    'brand', by_brand,
    'replies_today', replies_today,
    'new_accounts_from_contacts_today', accounts_today,
    'follow_ups_due', follow_due,
    'timezone', tz,
    'day_start', day_start,
    'day_end', day_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hq_outreach_daily_progress(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

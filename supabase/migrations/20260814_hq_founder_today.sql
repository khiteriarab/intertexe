-- Founder Today aggregates. Small tables only. No products/catalog joins.

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
  d7 := day_start - interval '7 days';
  d30 := day_start - interval '30 days';

  WITH first_scans AS (
    SELECT s.user_id::text AS uid, min(s.scanned_at) AS first_at
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
        AND c.next_follow_up_at IS NOT NULL
        AND c.next_follow_up_at <= now()
        AND c.outreach_status NOT IN ('converted','not_interested','dormant')
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
          AND c.contact_type IN ('customer','influencer','business','brand')
        GROUP BY c.contact_type
      ) t
    )
  ) INTO out;

  RETURN out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hq_founder_today(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

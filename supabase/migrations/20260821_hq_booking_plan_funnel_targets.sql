-- Align seeded $50K booking-plan labels and December funnel with the
-- scaled booking plan (Pilot = $5,000 Founding Material Data Pilot on /platform).
-- Additive: UPDATE existing seed rows only. Does not create or drop tables.

UPDATE public.hq_revenue_streams
SET label = 'Pilot'
WHERE key = 'api_pilot' AND label = 'API pilot';

UPDATE public.hq_revenue_streams
SET label = 'Integration'
WHERE key = 'api_integration' AND label = 'API integration';

UPDATE public.hq_revenue_targets
SET
  name = 'Pilots',
  notes = 'Five $5,000 Founding Material Data Pilots sold on /platform.'
WHERE metric = 'booked_revenue_stream'
  AND revenue_stream = 'api_pilot';

UPDATE public.hq_revenue_targets
SET name = 'Integration'
WHERE metric = 'booked_revenue_stream'
  AND revenue_stream = 'api_integration'
  AND name = 'API integration';

UPDATE public.hq_revenue_targets
SET target_value = 150,
    notes = 'Qualified B2B accounts scored.'
WHERE metric = 'funnel_qualified_account'
  AND target_date = '2026-12-31';

UPDATE public.hq_revenue_targets
SET target_value = 60
WHERE metric = 'funnel_snapshot_sent'
  AND target_date = '2026-12-31';

UPDATE public.hq_revenue_targets
SET target_value = 30
WHERE metric = 'funnel_meeting'
  AND target_date = '2026-12-31';

UPDATE public.hq_revenue_targets
SET target_value = 15
WHERE metric = 'funnel_proposal'
  AND target_date = '2026-12-31';

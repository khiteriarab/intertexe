-- Founder $50K command center: deals, payments, revenue activities, editable targets.
-- Additive only: CREATE TABLE IF NOT EXISTS plus seeds. Does not alter hq_contacts,
-- hq_affiliate_transactions, hq_metric_definitions, material_* or any catalog table.
--
-- Reverse (manual, drops new objects only):
--   DROP TABLE IF EXISTS public.hq_revenue_activities;
--   DROP TABLE IF EXISTS public.hq_deal_payments;
--   DROP TABLE IF EXISTS public.hq_deals;
--   DROP TABLE IF EXISTS public.hq_revenue_targets;
--   DROP TABLE IF EXISTS public.hq_founder_confirmations;
--   DROP TABLE IF EXISTS public.hq_deal_stages;
--   DROP TABLE IF EXISTS public.hq_revenue_streams;
--
-- Service-role only. RLS enabled with no anon/authenticated policy.

-- ---------------------------------------------------------------------------
-- Taxonomies (editable in HQ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_deal_stages (
  key text PRIMARY KEY,
  label text NOT NULL,
  probability numeric NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 1),
  sort_order integer NOT NULL DEFAULT 100,
  is_open boolean NOT NULL DEFAULT true,
  is_won boolean NOT NULL DEFAULT false
);

INSERT INTO public.hq_deal_stages (key, label, probability, sort_order, is_open, is_won) VALUES
  ('prospect', 'Prospect', 0.05, 10, true, false),
  ('qualified', 'Qualified', 0.10, 20, true, false),
  ('snapshot_sent', 'Snapshot sent', 0.20, 30, true, false),
  ('meeting', 'Meeting', 0.35, 40, true, false),
  ('proposal', 'Proposal', 0.60, 50, true, false),
  ('verbal', 'Verbal agreement', 0.80, 60, true, false),
  ('won', 'Won', 1.00, 70, false, true),
  ('lost', 'Lost', 0.00, 80, false, false)
ON CONFLICT (key) DO NOTHING;

-- scope keeps INTERTEXE company revenue separate from @khiteri personal revenue.
CREATE TABLE IF NOT EXISTS public.hq_revenue_streams (
  key text PRIMARY KEY,
  label text NOT NULL,
  scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company', 'personal')),
  sort_order integer NOT NULL DEFAULT 100
);

INSERT INTO public.hq_revenue_streams (key, label, scope, sort_order) VALUES
  ('api_pilot', 'API pilot', 'company', 10),
  ('api_integration', 'API integration', 'company', 20),
  ('affiliate', 'Affiliate', 'company', 30),
  ('intertexe_partnership', 'INTERTEXE partnership', 'company', 40),
  ('creator_partnership', '@khiteri creator partnership', 'personal', 50)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Editable founder targets (milestones, stream mix, funnel, weekly activity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'combined' CHECK (scope IN ('company', 'personal', 'combined')),
  metric text NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  target_date date NOT NULL,
  period_start date,
  revenue_stream text REFERENCES public.hq_revenue_streams(key),
  unit_target integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hq_revenue_targets_unique_key
  ON public.hq_revenue_targets (
    workspace_id,
    metric,
    scope,
    target_date,
    coalesce(revenue_stream, '')
  );

CREATE INDEX IF NOT EXISTS hq_revenue_targets_workspace_metric
  ON public.hq_revenue_targets (workspace_id, metric, target_date);

-- ---------------------------------------------------------------------------
-- Opportunities. Contacts stay canonical in hq_contacts; this only adds
-- deal value, stage, probability and close dates.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  opportunity text,
  contact_id uuid REFERENCES public.hq_contacts(id) ON DELETE SET NULL,
  -- Plain uuid: material_api_clients may not exist yet in every environment.
  material_api_client_id uuid,
  revenue_stream text NOT NULL DEFAULT 'api_pilot' REFERENCES public.hq_revenue_streams(key),
  scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company', 'personal')),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  stage text NOT NULL DEFAULT 'prospect' REFERENCES public.hq_deal_stages(key),
  probability_override numeric CHECK (probability_override >= 0 AND probability_override <= 1),
  expected_close_date date,
  booked_at timestamptz,
  closed_at timestamptz,
  lost_reason text,
  next_action text,
  next_action_at timestamptz,
  source text,
  notes text,
  entry_mode text NOT NULL DEFAULT 'manual' CHECK (entry_mode IN ('manual', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_deals_workspace_stage ON public.hq_deals (workspace_id, stage);
CREATE INDEX IF NOT EXISTS hq_deals_workspace_booked ON public.hq_deals (workspace_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS hq_deals_workspace_next_action ON public.hq_deals (workspace_id, next_action_at);

-- ---------------------------------------------------------------------------
-- Cash collected. Never derived from deal stage: only cleared rows count.
-- Refunds are stored as kind='refund' with a negative amount.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_deal_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.hq_deals(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company', 'personal')),
  revenue_stream text REFERENCES public.hq_revenue_streams(key),
  amount numeric NOT NULL,
  kind text NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment', 'refund')),
  status text NOT NULL DEFAULT 'cleared' CHECK (status IN ('pending', 'cleared', 'failed')),
  paid_at timestamptz,
  invoice_reference text,
  method text,
  notes text,
  entry_mode text NOT NULL DEFAULT 'manual' CHECK (entry_mode IN ('manual', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_deal_payments_workspace_paid
  ON public.hq_deal_payments (workspace_id, status, paid_at DESC);
CREATE INDEX IF NOT EXISTS hq_deal_payments_deal ON public.hq_deal_payments (deal_id);

-- ---------------------------------------------------------------------------
-- Revenue-generating activity. Bulk/automated email is not counted here;
-- only explicitly recorded personalized work.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_revenue_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.hq_deals(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.hq_contacts(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (
    activity_type IN (
      'qualified_account',
      'personalized_outreach',
      'snapshot_sent',
      'meeting',
      'proposal'
    )
  ),
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  entry_mode text NOT NULL DEFAULT 'manual' CHECK (entry_mode IN ('manual', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_revenue_activities_workspace_completed
  ON public.hq_revenue_activities (workspace_id, activity_type, completed_at DESC);

-- ---------------------------------------------------------------------------
-- Founder-confirmed release-gate checks that cannot be derived from state.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_founder_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hq_workspaces(id) ON DELETE CASCADE,
  check_key text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, check_key)
);

-- ---------------------------------------------------------------------------
-- Seed the September / December plan for every existing workspace.
-- Values remain founder-editable; re-running never overwrites edits.
-- ---------------------------------------------------------------------------
INSERT INTO public.hq_revenue_targets (workspace_id, name, scope, metric, target_value, target_date, period_start, notes)
SELECT
  w.id,
  seed.name,
  'combined',
  'booked_revenue_cumulative',
  seed.target_value,
  seed.target_date::date,
  seed.period_start::date,
  seed.notes
FROM public.hq_workspaces w
CROSS JOIN (
  VALUES
    ('Plan start', 0, '2026-08-18', '2026-08-18', 'Cumulative plan starts at zero booked revenue.'),
    ('September milestone', 5000, '2026-09-30', '2026-08-18', 'Close the first founding pilot and prove the sales process.'),
    ('October', 15000, '2026-10-31', '2026-10-01', 'Close two additional pilots using the first proof.'),
    ('November', 30000, '2026-11-30', '2026-11-01', 'Add another pilot plus creator, affiliate or partnership revenue.'),
    ('December goal', 50000, '2026-12-31', '2026-12-01', 'Close the final pilot, an API integration and remaining channel revenue.')
) AS seed(name, target_value, target_date, period_start, notes)
ON CONFLICT DO NOTHING;

INSERT INTO public.hq_revenue_targets (workspace_id, name, scope, metric, target_value, target_date, revenue_stream, unit_target, notes)
SELECT
  w.id,
  seed.name,
  seed.scope,
  'booked_revenue_stream',
  seed.target_value,
  '2026-12-31'::date,
  seed.revenue_stream,
  seed.unit_target,
  seed.notes
FROM public.hq_workspaces w
CROSS JOIN (
  VALUES
    ('API pilots', 'company', 25000, 'api_pilot', 5, 'Five pilots at $5,000.'),
    ('API integration', 'company', 12500, 'api_integration', 1, 'One early integration at the expected $12,500 deal size.'),
    ('@khiteri creator partnerships', 'personal', 9000, 'creator_partnership', 3, 'Three partnerships at $3,000, contracted personally.'),
    ('Affiliate commissions', 'company', 3500, 'affiliate', NULL, 'Confirmed commission revenue.')
) AS seed(name, scope, target_value, revenue_stream, unit_target, notes)
ON CONFLICT DO NOTHING;

INSERT INTO public.hq_revenue_targets (workspace_id, name, scope, metric, target_value, target_date, period_start, notes)
SELECT
  w.id,
  seed.name,
  'combined',
  seed.metric,
  seed.target_value,
  seed.target_date::date,
  '2026-08-18'::date,
  seed.notes
FROM public.hq_workspaces w
CROSS JOIN (
  VALUES
    ('Qualified accounts by September 30', 'funnel_qualified_account', 100, '2026-09-30', 'Scored from the existing Supabase brand and BD lists.'),
    ('Snapshots by September 30', 'funnel_snapshot_sent', 20, '2026-09-30', 'Personalized Material Data Snapshots prepared or sent.'),
    ('Meetings by September 30', 'funnel_meeting', 12, '2026-09-30', 'Qualified discovery meetings completed or booked.'),
    ('Proposals by September 30', 'funnel_proposal', 3, '2026-09-30', 'Pilot proposals sent.'),
    ('Paid pilots by September 30', 'funnel_won', 1, '2026-09-30', 'One paid pilot signed.'),
    ('API integrations by September 30', 'funnel_api_integration', 0, '2026-09-30', 'Not expected before the first pilot closes.'),
    ('Qualified accounts by December 31', 'funnel_qualified_account', 100, '2026-12-31', 'Qualified B2B accounts scored.'),
    ('Snapshots by December 31', 'funnel_snapshot_sent', 40, '2026-12-31', 'Personalized snapshots sent.'),
    ('Meetings by December 31', 'funnel_meeting', 20, '2026-12-31', 'Discovery meetings.'),
    ('Proposals by December 31', 'funnel_proposal', 10, '2026-12-31', 'Pilot proposals sent.'),
    ('Paid pilots by December 31', 'funnel_won', 5, '2026-12-31', 'Five paid pilots.'),
    ('API integrations by December 31', 'funnel_api_integration', 1, '2026-12-31', 'One early integration.')
) AS seed(name, metric, target_value, target_date, notes)
ON CONFLICT DO NOTHING;

INSERT INTO public.hq_revenue_targets (workspace_id, name, scope, metric, target_value, target_date, period_start, notes)
SELECT
  w.id,
  seed.name,
  'combined',
  seed.metric,
  seed.target_value,
  '2026-12-31'::date,
  '2026-08-18'::date,
  'Weekly activity target. Editable in HQ.'
FROM public.hq_workspaces w
CROSS JOIN (
  VALUES
    ('Personalized outreaches per week', 'weekly_personalized_outreach', 25),
    ('Snapshots per week', 'weekly_snapshot_sent', 3),
    ('Meetings per week', 'weekly_meeting', 2),
    ('Proposals per week', 'weekly_proposal', 1)
) AS seed(name, metric, target_value)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: founder HQ reads through service_role only. No anon/authenticated access.
-- ---------------------------------------------------------------------------
ALTER TABLE public.hq_deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_revenue_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_revenue_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_deal_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_revenue_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_founder_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hq_service_all ON public.hq_deal_stages;
CREATE POLICY hq_service_all ON public.hq_deal_stages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_revenue_streams;
CREATE POLICY hq_service_all ON public.hq_revenue_streams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_revenue_targets;
CREATE POLICY hq_service_all ON public.hq_revenue_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_deals;
CREATE POLICY hq_service_all ON public.hq_deals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_deal_payments;
CREATE POLICY hq_service_all ON public.hq_deal_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_revenue_activities;
CREATE POLICY hq_service_all ON public.hq_revenue_activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hq_service_all ON public.hq_founder_confirmations;
CREATE POLICY hq_service_all ON public.hq_founder_confirmations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.hq_deal_stages FROM anon, authenticated;
REVOKE ALL ON public.hq_revenue_streams FROM anon, authenticated;
REVOKE ALL ON public.hq_revenue_targets FROM anon, authenticated;
REVOKE ALL ON public.hq_deals FROM anon, authenticated;
REVOKE ALL ON public.hq_deal_payments FROM anon, authenticated;
REVOKE ALL ON public.hq_revenue_activities FROM anon, authenticated;
REVOKE ALL ON public.hq_founder_confirmations FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_deal_stages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_revenue_streams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_revenue_targets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_deals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_deal_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_revenue_activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_founder_confirmations TO service_role;

NOTIFY pgrst, 'reload schema';

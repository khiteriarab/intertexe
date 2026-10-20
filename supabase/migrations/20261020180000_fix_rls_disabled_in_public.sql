-- Fix Supabase Security Advisor: rls_disabled_in_public (CRITICAL)
-- Anyone with the project URL + anon key could read/write tables that had
-- RLS off. Enable RLS everywhere in public, allow only intentional public
-- SELECT on catalog surfaces, and deny anon/authenticated writes.
--
-- service_role bypasses RLS (server/cron paths keep working).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._intertexe_enable_rls(p_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', p_table);
END;
$$;

CREATE OR REPLACE FUNCTION public._intertexe_drop_policies(p_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pol record;
  rel text := p_table::text;
  tname text;
BEGIN
  -- regclass::text may be "products" or "public.products" (possibly quoted).
  tname := regexp_replace(split_part(rel, '.', 2), '^"|"$', '', 'g');
  IF tname = '' THEN
    tname := regexp_replace(rel, '^"|"$', '', 'g');
  END IF;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = tname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol.policyname, p_table);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1) Public catalog: SELECT ok for anon/authenticated, writes denied
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  catalog_tables text[] := ARRAY[
    'products',
    'designers',
    'brand_profiles',
    'homepage_merch_rails',
    'homepage_feed_meta',
    'homepage_feed_items',
    'homepage_trending_cards',
    'catalog_taxonomy_nodes',
    'catalog_taxonomy_node_stats_cache',
    'catalog_material_hub_counts',
    'collection_product_memberships',
    'product_taxonomy_assignments',
    'product_garment_facts',
    'product_material_facts',
    'product_offer_classification',
    'product_rail_membership',
    'canonical_products',
    'platform_stats_cache'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY catalog_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    PERFORM public._intertexe_enable_rls(('public.' || t)::regclass);
    PERFORM public._intertexe_drop_policies(('public.' || t)::regclass);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t || '_public_select',
      t
    );

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;

  -- Scanner barcode cache: clients may upsert compositions; delete stays service-only.
  IF to_regclass('public.barcode_compositions') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.barcode_compositions');
    PERFORM public._intertexe_drop_policies('public.barcode_compositions');
    CREATE POLICY barcode_compositions_public_select
      ON public.barcode_compositions FOR SELECT TO anon, authenticated
      USING (true);
    CREATE POLICY barcode_compositions_client_insert
      ON public.barcode_compositions FOR INSERT TO anon, authenticated
      WITH CHECK (true);
    CREATE POLICY barcode_compositions_client_update
      ON public.barcode_compositions FOR UPDATE TO anon, authenticated
      USING (true)
      WITH CHECK (true);
    REVOKE ALL ON TABLE public.barcode_compositions FROM PUBLIC;
    REVOKE DELETE, TRUNCATE ON TABLE public.barcode_compositions FROM anon, authenticated;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.barcode_compositions TO anon, authenticated;
    GRANT ALL ON TABLE public.barcode_compositions TO service_role;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) User-owned tables: authenticated own-row only (no anon access)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.users');
    PERFORM public._intertexe_drop_policies('public.users');
    CREATE POLICY users_select_own ON public.users
      FOR SELECT TO authenticated
      USING (id::text = auth.uid()::text);
    CREATE POLICY users_insert_own ON public.users
      FOR INSERT TO authenticated
      WITH CHECK (id::text = auth.uid()::text);
    CREATE POLICY users_update_own ON public.users
      FOR UPDATE TO authenticated
      USING (id::text = auth.uid()::text)
      WITH CHECK (id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.users FROM PUBLIC, anon;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
    GRANT ALL ON TABLE public.users TO service_role;
  END IF;

  IF to_regclass('public.product_favorites') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.product_favorites');
    PERFORM public._intertexe_drop_policies('public.product_favorites');
    CREATE POLICY product_favorites_select_own ON public.product_favorites
      FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
    CREATE POLICY product_favorites_insert_own ON public.product_favorites
      FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
    CREATE POLICY product_favorites_delete_own ON public.product_favorites
      FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.product_favorites FROM PUBLIC, anon;
    GRANT SELECT, INSERT, DELETE ON TABLE public.product_favorites TO authenticated;
    GRANT ALL ON TABLE public.product_favorites TO service_role;
  END IF;

  IF to_regclass('public.favorites') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.favorites');
    PERFORM public._intertexe_drop_policies('public.favorites');
    CREATE POLICY favorites_select_own ON public.favorites
      FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
    CREATE POLICY favorites_insert_own ON public.favorites
      FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
    CREATE POLICY favorites_delete_own ON public.favorites
      FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.favorites FROM PUBLIC, anon;
    GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;
    GRANT ALL ON TABLE public.favorites TO service_role;
  END IF;

  IF to_regclass('public.price_watches') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.price_watches');
    PERFORM public._intertexe_drop_policies('public.price_watches');
    CREATE POLICY price_watches_own ON public.price_watches
      FOR ALL TO authenticated
      USING (user_id::text = auth.uid()::text)
      WITH CHECK (user_id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.price_watches FROM PUBLIC, anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_watches TO authenticated;
    GRANT ALL ON TABLE public.price_watches TO service_role;
  END IF;

  IF to_regclass('public.quiz_results') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.quiz_results');
    PERFORM public._intertexe_drop_policies('public.quiz_results');
    CREATE POLICY quiz_results_select_own ON public.quiz_results
      FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
    CREATE POLICY quiz_results_insert_own ON public.quiz_results
      FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.quiz_results FROM PUBLIC, anon;
    GRANT SELECT, INSERT ON TABLE public.quiz_results TO authenticated;
    GRANT ALL ON TABLE public.quiz_results TO service_role;
  END IF;

  IF to_regclass('public.user_product_clickouts') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.user_product_clickouts');
    PERFORM public._intertexe_drop_policies('public.user_product_clickouts');
    CREATE POLICY user_product_clickouts_select_own ON public.user_product_clickouts
      FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
    CREATE POLICY user_product_clickouts_insert_own ON public.user_product_clickouts
      FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.user_product_clickouts FROM PUBLIC, anon;
    GRANT SELECT, INSERT ON TABLE public.user_product_clickouts TO authenticated;
    GRANT ALL ON TABLE public.user_product_clickouts TO service_role;
  END IF;

  IF to_regclass('public.user_push_tokens') IS NOT NULL THEN
    PERFORM public._intertexe_enable_rls('public.user_push_tokens');
    PERFORM public._intertexe_drop_policies('public.user_push_tokens');
    CREATE POLICY user_push_tokens_own ON public.user_push_tokens
      FOR ALL TO authenticated
      USING (user_id::text = auth.uid()::text)
      WITH CHECK (user_id::text = auth.uid()::text);
    REVOKE ALL ON TABLE public.user_push_tokens FROM PUBLIC, anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_push_tokens TO authenticated;
    GRANT ALL ON TABLE public.user_push_tokens TO service_role;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Internal / ops tables: RLS on, no anon/authenticated policies (= deny)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  locked text[] := ARRAY[
    'system_status',
    'sync_logs',
    'feed_staged_rows',
    'feed_staging_sessions',
    'feed_promotion_history',
    'catalog_product_snapshots',
    'catalog_product_snapshot_rows',
    'price_drop_notifications',
    'email_deliveries',
    'weekly_edit_queue',
    'scan_follow_up_queue',
    'scan_sessions',
    'scan_feedback',
    'extension_auth_codes',
    'invitation_codes',
    'referrals',
    'external_captures',
    'capture_events',
    'enterprise_identity_links',
    'enterprise_handoff_sessions',
    'material_api_clients',
    'material_api_keys',
    'material_api_usage',
    'material_snapshot_leads',
    'material_evidence',
    'hq_oauth_connections',
    'hq_integration_metric_snapshots',
    'hq_contacts',
    'hq_contact_outreach',
    'hq_contact_types',
    'hq_outreach_statuses',
    'hq_contact_sources',
    'hq_relationship_statuses',
    'hq_next_action_types',
    'hq_content_items',
    'hq_deal_stages',
    'hq_revenue_streams',
    'hq_revenue_targets',
    'hq_deals',
    'hq_deal_payments',
    'hq_revenue_activities',
    'hq_founder_confirmations'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY locked LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    PERFORM public._intertexe_enable_rls(('public.' || t)::regclass);
    PERFORM public._intertexe_drop_policies(('public.' || t)::regclass);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- Catch-all: any remaining public BASE TABLE without RLS
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname NOT LIKE 'pg_%'
  LOOP
    PERFORM public._intertexe_enable_rls(('public.' || r.tablename)::regclass);
    -- No policies => deny for anon/authenticated; service_role still bypasses.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public._intertexe_enable_rls(regclass);
DROP FUNCTION IF EXISTS public._intertexe_drop_policies(regclass);

-- Verification helpers (commented):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY 1;
-- SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;

-- Chrome Web Store HQ integration: listing connect + first-party usage snapshots.
-- Chrome Web Store has no public installs API. Website clicks are never installs.

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
      'gmail',
      'chrome_web_store'
    ));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'hq_oauth_connections provider check: %', SQLERRM;
END $$;

INSERT INTO public.hq_data_sources (workspace_id, key, label, status, sync_frequency)
SELECT w.id, d.key, d.label, d.status, d.sync_frequency
FROM public.hq_workspaces w
CROSS JOIN (VALUES
  ('chrome_extension', 'Chrome extension', 'connected', 'daily'),
  ('chrome_web_store', 'Chrome Web Store', 'not_connected', 'daily')
) AS d(key, label, status, sync_frequency)
ON CONFLICT (workspace_id, key) DO UPDATE
SET
  label = EXCLUDED.label,
  sync_frequency = EXCLUDED.sync_frequency;

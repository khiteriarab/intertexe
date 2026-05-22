-- Run ONLY after 20240018_merch_refresh_v2.sql has been applied successfully.

-- Optional explicit cast (fixes "unknown" type in some SQL editors):
SELECT public.refresh_homepage_feeds_v2('us'::text);

-- Or use default region:
-- SELECT public.refresh_homepage_feeds_v2();

-- Verify:
SELECT rail_key, row_count, source_rows, display_count, last_error, refreshed_at
FROM public.homepage_feed_meta
WHERE rail_key <> 'global'
ORDER BY rail_key;

SELECT rail_key, COUNT(*) AS items
FROM public.homepage_feed_items
GROUP BY rail_key
ORDER BY rail_key;

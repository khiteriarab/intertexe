-- =============================================================================
-- Verify consumer scope layer (read-only)
-- Run after applying 20240020_catalog_consumer_scope.sql
-- =============================================================================

SET statement_timeout = '120s';

SELECT 'products_total' AS metric, COUNT(*)::bigint AS n FROM public.products;

SELECT 'approved_yes' AS metric, COUNT(*)::bigint AS n
FROM public.products WHERE approved = 'yes';

SELECT 'live_products' AS metric, COUNT(*)::bigint AS n FROM public.live_products;

SELECT 'live_products_apparel' AS metric, COUNT(*)::bigint AS n FROM public.live_products_apparel;

SELECT 'excluded_reason_on_approved_yes' AS section,
  public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) AS reason,
  COUNT(*)::bigint AS n
FROM public.products p
WHERE p.approved = 'yes'
  AND coalesce(p.is_active, true) IS TRUE
  AND public.catalog_consumer_exclusion_reason(
    p.category, p.name, p.composition, p.image_url, p.price, p.url
  ) IS NOT NULL
GROUP BY 1
ORDER BY n DESC;

SELECT 'catalog_scope_summary' AS section, catalog_scope, COUNT(*)::bigint AS n
FROM public.products_catalog_scope
GROUP BY catalog_scope
ORDER BY n DESC;

SELECT 'homepage_feed_items_by_rail' AS section, rail_key, COUNT(*)::bigint AS n
FROM public.homepage_feed_items
GROUP BY rail_key
ORDER BY rail_key;

SELECT 'homepage_feed_meta' AS section, rail_key, row_count, source_rows, refreshed_at
FROM public.homepage_feed_meta
WHERE rail_key <> 'global'
ORDER BY rail_key;

-- Material hub sizing (post-refresh; apparel view only)
SELECT 'apparel_silk_composition' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE lower(coalesce(l.composition, '')) LIKE '%silk%';

SELECT 'apparel_linen_composition' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE lower(coalesce(l.composition, '')) LIKE '%linen%'
   OR lower(coalesce(l.composition, '')) LIKE '%flax%';

SELECT 'apparel_cashmere_composition' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE lower(coalesce(l.composition, '')) LIKE '%cashmere%';

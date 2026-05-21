-- =============================================================================
-- STEP 7 — Verification dashboard (read-only)
-- Run after DDL (20240021) and optional backfill batches (03–06).
-- =============================================================================

SET statement_timeout = '180s';

SELECT * FROM public.catalog_classification_summary;

-- Live consumer baseline
SELECT 'live_products_apparel' AS metric, COUNT(*)::bigint AS n FROM public.live_products_apparel;

SELECT 'consumer_catalog_cards' AS metric, COUNT(*)::bigint AS n FROM public.consumer_catalog_cards;

SELECT 'duplicate_visible_slots' AS metric,
  (SELECT COUNT(*)::bigint FROM public.live_products_apparel)
  - (SELECT COUNT(*)::bigint FROM public.consumer_catalog_cards) AS n;

-- Completeness on live apparel
SELECT 'completeness_status' AS section, completeness_status, COUNT(*)::bigint AS n
FROM (
  SELECT public.catalog_offer_completeness_status(
    l.category, l.name, l.composition, l.image_url, l.price, l.url, l.currency
  ) AS completeness_status
  FROM public.live_products_apparel l
) x
GROUP BY completeness_status ORDER BY n DESC;

-- Persisted classification (after backfill)
SELECT 'classified_offers' AS metric, COUNT(*)::bigint AS n FROM public.product_offer_classification;

SELECT 'material_primary' AS section, material_primary, COUNT(*)::bigint AS n
FROM public.product_offer_classification
GROUP BY material_primary ORDER BY n DESC;

SELECT 'garment_type' AS section, garment_type, COUNT(*)::bigint AS n
FROM public.product_offer_classification
GROUP BY garment_type ORDER BY n DESC;

SELECT 'needs_review_reason' AS section, needs_review_reason, COUNT(*)::bigint AS n
FROM public.product_offer_classification
WHERE completeness_status = 'needs_review'
GROUP BY needs_review_reason ORDER BY n DESC;

-- Quality gaps (should trend to 0 on complete offers)
SELECT 'missing_currency_live' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.currency IS NULL OR trim(coalesce(l.currency, '')) = '';

SELECT 'missing_image_live' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.image_url IS NULL OR trim(l.image_url) = '';

SELECT 'missing_price_live' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.price IS NULL OR trim(l.price) = '';

SELECT 'missing_url_live' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE NOT public.catalog_product_url_valid(l.url);

SELECT 'missing_composition_live' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE l.composition IS NULL OR trim(l.composition) = '';

-- Canonical + rails
SELECT 'canonical_products' AS metric, COUNT(*)::bigint AS n FROM public.canonical_products;

SELECT 'offers_with_canonical_id' AS metric, COUNT(*)::bigint AS n
FROM public.products p
JOIN public.live_products_apparel l ON l.id = p.id
WHERE p.canonical_id IS NOT NULL;

SELECT 'rail_membership_active' AS section, rail_key, COUNT(*)::bigint AS n
FROM public.product_rail_membership
WHERE active IS TRUE
GROUP BY rail_key ORDER BY rail_key;

SELECT 'homepage_feed_meta' AS section, rail_key, row_count, source_rows, refreshed_at, last_error
FROM public.homepage_feed_meta
WHERE rail_key <> 'global'
ORDER BY rail_key;

SELECT 'homepage_feed_items' AS section, rail_key, COUNT(*)::bigint AS n
FROM public.homepage_feed_items
GROUP BY rail_key ORDER BY rail_key;

-- Women's only check: all live apparel should pass womens gate
SELECT 'not_womens_in_apparel_view' AS metric, COUNT(*)::bigint AS n
FROM public.live_products_apparel l
WHERE NOT public.catalog_is_womens_apparel_category(l.category, l.name);

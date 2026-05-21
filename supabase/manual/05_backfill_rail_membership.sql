-- =============================================================================
-- STEP 4b / 5 — Rebuild product_rail_membership from derived classification
-- Prereq: 04 canonical linked. TRUNCATE membership only (not products).
-- =============================================================================

SET statement_timeout = '300s';

TRUNCATE public.product_rail_membership;

INSERT INTO public.product_rail_membership (canonical_id, rail_key, source, priority, active)
SELECT DISTINCT
  cp.canonical_id,
  rk AS rail_key,
  'derived_v1' AS source,
  100::smallint,
  true
FROM public.canonical_products cp
JOIN public.products p ON p.canonical_id = cp.canonical_id
JOIN public.product_offer_classification c ON c.offer_id = p.id
CROSS JOIN LATERAL unnest(c.inferred_rail_keys) AS rk
WHERE c.completeness_status = 'complete'
  AND rk IS NOT NULL
ON CONFLICT (canonical_id, rail_key, source) DO NOTHING;

-- Per-rail counts
SELECT rail_key, COUNT(*)::bigint AS canonical_count
FROM public.product_rail_membership
WHERE active IS TRUE
GROUP BY rail_key
ORDER BY rail_key;

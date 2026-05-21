-- =============================================================================
-- STEP 6 — Refresh homepage feeds from product_rail_membership (per rail)
-- Prereq: 05 membership populated. Run ONE rail per tab. Falls back if membership empty.
-- =============================================================================

-- ========== fabrics:silk (from membership) ==========
SET statement_timeout = '90s';
DO $$
DECLARE v_ins int; v_cnt int;
BEGIN
  DROP TABLE IF EXISTS _src;
  CREATE TEMP TABLE _src ON COMMIT DROP AS
  SELECT l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
    l.natural_fiber_percent, l.category, l.is_sale, l.created_at,
    row_number() OVER (ORDER BY l.natural_fiber_percent DESC NULLS LAST) AS sort_ord
  FROM public.live_products_apparel l
  JOIN public.products p ON p.id = l.id
  JOIN public.product_rail_membership m ON m.canonical_id = p.canonical_id
    AND m.rail_key = 'fabrics:silk' AND m.active IS TRUE
  WHERE EXISTS (
    SELECT 1 FROM public.product_offer_classification c
    WHERE c.offer_id = l.id AND c.completeness_status = 'complete'
  )
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  IF v_cnt = 0 THEN
    RAISE NOTICE 'membership empty for fabrics:silk — skip or run refresh_one_rail_at_a_time.sql BLOCK A';
    RETURN;
  END IF;
  v_ins := public.homepage_feed_insert_picked(
    'fabrics:silk'::text, 32::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'fabrics:silk';
END $$;

-- Repeat pattern for other rails: change rail_key in JOIN and UPDATE.
-- Or continue using supabase/manual/refresh_one_rail_at_a_time.sql until membership cutover is signed off.

-- VERIFY
SELECT rail_key, row_count, source_rows, refreshed_at, last_error
FROM public.homepage_feed_meta
WHERE rail_key <> 'global'
ORDER BY rail_key;

-- Run ONE block at a time. Copy ONLY from SET through END $$; then Run.
-- Uses live_products_apparel (consumer scope) — no editorial_collection_products RPC.

-- ========== BLOCK A: fabrics:silk ==========
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
  WHERE lower(coalesce(l.composition, '')) LIKE '%silk%'
     OR lower(coalesce(l.composition, '')) LIKE '%mulberry%'
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
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

-- ========== BLOCK B: fabrics:linen ==========
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
  WHERE lower(coalesce(l.composition, '')) LIKE '%linen%'
     OR lower(coalesce(l.composition, '')) LIKE '%flax%'
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'fabrics:linen'::text, 32::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'fabrics:linen';
END $$;

-- ========== BLOCK C: fabrics:cashmere ==========
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
  WHERE lower(coalesce(l.composition, '')) LIKE '%cashmere%'
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'fabrics:cashmere'::text, 32::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'fabrics:cashmere';
END $$;

-- ========== BLOCK D: fabrics:wool ==========
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
  WHERE lower(coalesce(l.composition, '')) LIKE '%wool%'
     OR lower(coalesce(l.composition, '')) LIKE '%merino%'
     OR lower(coalesce(l.composition, '')) LIKE '%lambswool%'
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'fabrics:wool'::text, 32::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'fabrics:wool';
END $$;

-- ========== BLOCK E: fabrics:cotton ==========
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
  WHERE lower(coalesce(l.composition, '')) LIKE '%cotton%'
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'fabrics:cotton'::text, 32::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'fabrics:cotton';
END $$;

-- ========== BLOCK F: collections:vacation ==========
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
  WHERE l.collection_slugs && ARRAY['vacation-shop','vacation-edit']::text[]
     OR lower(coalesce(l.composition, '')) LIKE '%linen%'
     OR lower(coalesce(l.composition, '')) LIKE '%cotton%'
  LIMIT 800;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'collections:vacation'::text, 24::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'collections:vacation';
END $$;

-- ========== BLOCK G: top:new_in ==========
SET statement_timeout = '90s';
DO $$
DECLARE v_ins int; v_cnt int;
BEGIN
  DROP TABLE IF EXISTS _src;
  CREATE TEMP TABLE _src ON COMMIT DROP AS
  SELECT l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
    l.natural_fiber_percent, l.category, l.is_sale, l.created_at,
    row_number() OVER (ORDER BY l.created_at DESC NULLS LAST) AS sort_ord
  FROM public.live_products_apparel l
  WHERE l.brand_slug = ANY (ARRAY[
    'frame','vince','theory','toteme','ganni','staud','khaite','isabel-marant',
    'rag-and-bone','citizens-of-humanity','reformation','nili-lotan'
  ]::text[])
  LIMIT 200;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'top:new_in'::text, 20::smallint, 3::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'top:new_in';
END $$;

-- ========== BLOCK H: sale:all ==========
SET statement_timeout = '90s';
DO $$
DECLARE v_ins int; v_cnt int;
BEGIN
  DROP TABLE IF EXISTS _src;
  CREATE TEMP TABLE _src ON COMMIT DROP AS
  SELECT l.id, l.product_id, l.brand_slug, l.brand_name, l.name, l.url, l.image_url, l.price,
    l.natural_fiber_percent, l.category, true AS is_sale, l.created_at,
    row_number() OVER (ORDER BY l.natural_fiber_percent DESC NULLS LAST) AS sort_ord
  FROM public.live_products_apparel l
  WHERE l.is_sale IS TRUE
  LIMIT 300;
  SELECT COUNT(*)::int INTO v_cnt FROM _src;
  v_ins := public.homepage_feed_insert_picked(
    'sale:all'::text, 32::smallint, 4::smallint,
    $pick$
      SELECT id, product_id, brand_slug, brand_name, name, url, image_url, price,
        natural_fiber_percent, category, is_sale, sort_ord FROM _src
    $pick$::text
  );
  UPDATE public.homepage_feed_meta SET row_count = v_ins, source_rows = v_cnt,
    last_error = NULL, refreshed_at = now()
  WHERE rail_key = 'sale:all';
END $$;

-- ========== VERIFY ==========
SELECT rail_key, row_count, source_rows, refreshed_at, last_error
FROM public.homepage_feed_meta
WHERE rail_key <> 'global'
ORDER BY rail_key;

SELECT rail_key, COUNT(*)::bigint AS n
FROM public.homepage_feed_items
GROUP BY rail_key
ORDER BY rail_key;

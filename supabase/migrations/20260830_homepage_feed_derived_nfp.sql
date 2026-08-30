-- Homepage feed cache: derive NFP from composition at write time (fixes stale 0% badges).
-- After apply: SELECT public.refresh_homepage_feeds_v2('us');

CREATE OR REPLACE FUNCTION public.homepage_feed_insert_picked(
  p_rail_key text,
  p_max_items smallint,
  p_max_per_brand smallint,
  p_source_sql text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted integer;
BEGIN
  DELETE FROM public.homepage_feed_items WHERE rail_key = p_rail_key;

  EXECUTE format($q$
    WITH src AS (%s),
    ranked AS (
      SELECT s.*, row_number() OVER (ORDER BY s.sort_ord) AS ord
      FROM src AS s
    ),
    diversified AS (
      SELECT r.*,
        row_number() OVER (PARTITION BY r.brand_slug ORDER BY r.ord) AS brand_ord,
        row_number() OVER (
          PARTITION BY public.homepage_style_base_name(r.name) ORDER BY r.ord
        ) AS style_ord
      FROM ranked AS r
    ),
    picked AS (
      SELECT d.*, row_number() OVER (ORDER BY d.ord) AS feed_rank
      FROM diversified AS d
      WHERE d.brand_ord <= %s AND d.style_ord = 1
      ORDER BY d.ord
      LIMIT %s
    )
    INSERT INTO public.homepage_feed_items (
      rail_key, rank, source_id, product_id, brand_slug, brand_name, name, url, image_url,
      price, natural_fiber_percent, category, is_sale
    )
    SELECT
      %L,
      p.feed_rank::smallint,
      p.id,
      p.product_id,
      p.brand_slug,
      p.brand_name,
      p.name,
      p.url,
      p.image_url,
      p.price,
      least(
        greatest(
          coalesce(
            public.catalog_derived_natural_fiber_percent(
              pr.composition,
              pr.material_metadata,
              pr.natural_fiber_percent::integer
            ),
            0
          ),
          0
        ),
        100
      )::smallint,
      p.category,
      coalesce(p.is_sale, false)
    FROM picked AS p
    JOIN public.products AS pr ON pr.id = p.id
    ORDER BY p.feed_rank
  $q$, p_source_sql, p_max_per_brand, p_max_items, p_rail_key);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.homepage_feed_insert_picked IS
  'Insert diversified homepage feed rows; NFP derived from products.composition at cache write time.';

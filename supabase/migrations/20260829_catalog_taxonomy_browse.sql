-- =============================================================================
-- Taxonomy classification inference + browse RPCs (retail-v1)
-- Offer-level assignments; indexed slug lookups; no runtime ILIKE browse.
-- =============================================================================

-- Normalize text helper
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_norm(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(trim(coalesce(p, '')));
$$;

-- Returns primary leaf slug + confidence + source for one apparel offer
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_infer_apparel(
  p_garment_type text,
  p_category text,
  p_name text
)
RETURNS TABLE (slug text, confidence smallint, source text)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  gt text := public.catalog_taxonomy_norm(p_garment_type);
  cat text := public.catalog_taxonomy_norm(p_category);
  nam text := public.catalog_taxonomy_norm(p_name);
  is_dress boolean := gt = 'dresses' OR cat ~ '(dress|gown)' OR nam ~ '\bdress\b' OR nam ~ '\bgown\b';
  is_skirt boolean := gt = 'skirts' OR cat ~ 'skirt' OR nam ~ '\bskirt\b';
  is_jacket boolean := gt = 'jackets_blazers' OR cat ~ 'jacket' OR cat ~ 'blazer'
    OR nam ~ '\bjacket\b' OR nam ~ '\bblazer\b';
  is_coat boolean := gt = 'coats' OR (cat ~ 'coat' AND NOT is_jacket) OR nam ~ '\bcoat\b';
  is_jean boolean := (gt = 'pants_trousers' OR cat ~ 'denim' OR cat ~ 'jean')
    AND (nam ~ '\bjean' OR cat ~ 'denim' OR nam ~ 'denim')
    AND NOT is_skirt AND NOT is_jacket;
  is_trouser boolean := gt = 'pants_trousers' AND NOT is_jean;
  is_shirt boolean := gt = 'shirts'
    OR ((cat ~ 'shirt' OR nam ~ '\bshirt\b') AND cat !~ 't-shirt' AND nam !~ 't-shirt' AND nam !~ 'shirtdress');
  is_blouse boolean := gt = 'tops_blouses' AND (cat ~ 'blouse' OR nam ~ '\bblouse\b');
  is_tank boolean := gt IN ('tops_blouses', 'shirts', 'tanks', 'camisoles')
    AND NOT is_dress
    AND (cat ~ 'camisole' OR cat ~ 'tank' OR nam ~ '\btank\b' OR nam ~ '\bcamisole\b' OR nam ~ '\bcami\b')
    AND nam !~ '\bdress\b';
  is_bridal boolean := is_dress AND (nam ~ 'bridal' OR nam ~ 'wedding' OR nam ~ '\bbride\b');
  is_knit boolean := gt IN ('knitwear', 'sweaters_cardigans');
  is_short boolean := gt = 'shorts';
  is_set boolean := gt = 'matching_sets' OR cat ~ 'co-ord' OR cat ~ 'coord' OR cat ~ 'two piece'
    OR nam ~ 'matching set' OR nam ~ 'co-ord';
  is_swim boolean := gt = 'swim_resortwear' OR cat ~ 'swim' OR cat ~ 'bikini' OR nam ~ 'swimwear';
BEGIN
  -- Ambiguity guards first
  IF is_bridal THEN
    slug := 'clothing/bridal-dresses'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_dress THEN
    slug := 'clothing/dresses'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_jean THEN
    slug := 'clothing/jeans'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_trouser THEN
    slug := 'clothing/trousers'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_skirt THEN
    slug := 'clothing/skirts'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_short THEN
    slug := 'clothing/shorts'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_jacket THEN
    slug := 'clothing/jackets'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_coat THEN
    slug := 'clothing/coats'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_knit THEN
    slug := 'clothing/knitwear'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_set THEN
    slug := 'clothing/matching-sets'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_swim THEN
    slug := 'clothing/swimwear'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_shirt AND NOT is_blouse AND NOT is_tank THEN
    slug := 'clothing/shirts'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  IF is_blouse THEN
    slug := 'clothing/blouses'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_tank THEN
    slug := 'clothing/tanks-and-camisoles'; confidence := 84; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF gt = 'tops_blouses' OR gt = 'shirts' THEN
    slug := 'clothing/shirts'; confidence := 72; source := 'garment_type'; RETURN NEXT; RETURN;
  END IF;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_infer_footwear(
  p_category text,
  p_name text
)
RETURNS TABLE (slug text, confidence smallint, source text)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := public.catalog_taxonomy_norm(p_category);
  nam text := public.catalog_taxonomy_norm(p_name);
  is_sneaker boolean := nam ~ 'sneaker' OR nam ~ 'trainer' OR nam ~ 'ballet runner';
  is_loafer boolean := nam ~ 'loafer' OR nam ~ 'penny';
  is_mary boolean := nam ~ 'mary jane';
  is_ballet boolean := (nam ~ 'ballet flat' OR nam ~ 'ballerina') AND NOT is_sneaker;
  is_ankle boolean := nam ~ 'ankle boot' OR nam ~ 'bootie' OR nam ~ 'ankle-boot';
  is_boot boolean := (nam ~ 'boot' OR nam ~ 'bootie') AND NOT is_sneaker
    AND nam !~ 'bootcut';
  is_pump boolean := nam ~ 'pump' OR nam ~ 'stiletto';
  is_mule boolean := nam ~ 'mule';
  is_sandal boolean := nam ~ 'sandal' OR nam ~ 'slide' OR nam ~ 'flip flop';
  is_heeled_sandal boolean := is_sandal AND (nam ~ 'heeled' OR nam ~ 'heel' OR nam ~ 'wedge' OR nam ~ '\d+\s*mm');
BEGIN
  IF is_sneaker THEN
    slug := 'shoes/sneakers'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_ankle THEN
    slug := 'shoes/ankle-boots'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_boot THEN
    slug := 'shoes/boots'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_pump THEN
    slug := 'shoes/pumps'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_heeled_sandal THEN
    slug := 'shoes/heeled-sandals'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_mule THEN
    slug := 'shoes/mules'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_mary THEN
    slug := 'shoes/mary-janes'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_ballet THEN
    slug := 'shoes/ballet-flats'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_loafer THEN
    slug := 'shoes/loafers'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF is_sandal THEN
    slug := 'shoes/sandals'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN;
  END IF;
  IF cat ~ 'shoe' OR cat ~ 'footwear' OR cat ~ 'sandal' THEN
    slug := 'shoes/sandals'; confidence := 60; source := 'retailer_category'; RETURN NEXT; RETURN;
  END IF;
  RETURN;
END;
$$;

-- Batch backfill (reversible by taxonomy_version delete)
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_backfill_batch(
  p_department text,
  p_limit int DEFAULT 5000,
  p_taxonomy_version text DEFAULT 'retail-v1'
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int := 0;
BEGIN
  IF lower(trim(p_department)) = 'clothing' THEN
    WITH batch AS (
      SELECT l.id, l.garment_type, l.category, l.name
      FROM public.live_products_apparel l
      LEFT JOIN public.product_taxonomy_assignments pta
        ON pta.offer_id = l.id AND pta.taxonomy_version = p_taxonomy_version
      WHERE pta.offer_id IS NULL
      LIMIT greatest(1, least(coalesce(p_limit, 5000), 20000))
    ),
    inferred AS (
      SELECT b.id AS offer_id, i.slug, i.confidence, i.source
      FROM batch b
      CROSS JOIN LATERAL public.catalog_taxonomy_infer_apparel(b.garment_type, b.category, b.name) i
      WHERE i.slug IS NOT NULL
    ),
    ins AS (
      INSERT INTO public.product_taxonomy_assignments (
        offer_id, taxonomy_slug, is_primary, source, confidence, taxonomy_version
      )
      SELECT offer_id, slug, true, source, confidence, p_taxonomy_version
      FROM inferred
      ON CONFLICT (offer_id, taxonomy_slug) DO NOTHING
      RETURNING offer_id
    )
    SELECT count(*)::int INTO n FROM ins;
  ELSIF lower(trim(p_department)) = 'shoes' THEN
    WITH batch AS (
      SELECT f.id, f.category, f.name
      FROM public.live_products_footwear f
      LEFT JOIN public.product_taxonomy_assignments pta
        ON pta.offer_id = f.id AND pta.taxonomy_version = p_taxonomy_version
      WHERE pta.offer_id IS NULL
      LIMIT greatest(1, least(coalesce(p_limit, 5000), 20000))
    ),
    inferred AS (
      SELECT b.id AS offer_id, i.slug, i.confidence, i.source
      FROM batch b
      CROSS JOIN LATERAL public.catalog_taxonomy_infer_footwear(b.category, b.name) i
      WHERE i.slug IS NOT NULL
    ),
    ins AS (
      INSERT INTO public.product_taxonomy_assignments (
        offer_id, taxonomy_slug, is_primary, source, confidence, taxonomy_version
      )
      SELECT offer_id, slug, true, source, confidence, p_taxonomy_version
      FROM inferred
      ON CONFLICT (offer_id, taxonomy_slug) DO NOTHING
      RETURNING offer_id
    )
    SELECT count(*)::int INTO n FROM ins;
  END IF;
  RETURN coalesce(n, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_backfill_batch(text, int, text) TO service_role;

-- Apparel taxonomy browse (jsonb contract aligned with catalog_browse_page_v2)
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_browse_page(
  p_region text DEFAULT 'us',
  p_taxonomy_slug text DEFAULT NULL,
  p_material_family text DEFAULT NULL,
  p_material_subtype text DEFAULT NULL,
  p_fabric_construction text DEFAULT NULL,
  p_min_nfp int DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := lower(coalesce(nullif(trim(p_region), ''), 'us'));
  slugs text[] := public.catalog_taxonomy_filter_slugs(p_taxonomy_slug);
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb,
      'has_more', false,
      'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_taxonomy_browse_page')
    );
  END IF;

  WITH eligible AS (
    SELECT DISTINCT pta.offer_id
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_slug = ANY(slugs)
  ),
  filtered AS (
    SELECT l.*
    FROM public.live_products_apparel l
    JOIN eligible e ON e.offer_id = l.id
    WHERE lower(coalesce(l.region, '')) = reg
      AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = ''
        OR lower(coalesce(l.brand_slug, '')) = lower(btrim(p_brand_slug)))
      AND (p_color IS NULL OR btrim(p_color) = ''
        OR lower(coalesce(l.color, '')) = lower(btrim(p_color)))
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR lower(coalesce(l.name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
        OR lower(coalesce(l.brand_name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
      )
      AND (
        p_min_price IS NULL
        OR coalesce(l.price_numeric, public.catalog_product_price_numeric(l.price::text)) >= p_min_price
      )
      AND (
        p_max_price IS NULL
        OR coalesce(l.price_numeric, public.catalog_product_price_numeric(l.price::text)) <= p_max_price
      )
      AND (
        p_min_nfp IS NULL OR coalesce(l.natural_fiber_percent, 0) >= p_min_nfp
      )
      AND (
        p_material_family IS NULL OR btrim(p_material_family) = ''
        OR lower(coalesce(l.fiber_primary, '')) = lower(btrim(p_material_family))
        OR lower(coalesce(l.composition, '')) LIKE '%' || lower(btrim(p_material_family)) || '%'
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS n FROM filtered
  ),
  paged AS (
    SELECT f.*
    FROM filtered f
    ORDER BY
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_asc', 'price-low') THEN
        coalesce(f.price_numeric, public.catalog_product_price_numeric(f.price::text)) END ASC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_desc', 'price-high') THEN
        coalesce(f.price_numeric, public.catalog_product_price_numeric(f.price::text)) END DESC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) = 'most_natural' THEN f.natural_fiber_percent END DESC NULLS LAST,
      f.is_editor_pick DESC NULLS LAST,
      f.created_at DESC NULLS LAST,
      f.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT c.n,
    coalesce(jsonb_agg(to_jsonb(p) - 'price_numeric'), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more
  FROM counted c
  LEFT JOIN LATERAL (SELECT * FROM paged LIMIT lim) p ON true
  GROUP BY c.n;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'exact',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_footwear_taxonomy_browse_page(
  p_region text DEFAULT 'us',
  p_taxonomy_slug text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := lower(coalesce(nullif(trim(p_region), ''), 'us'));
  slugs text[] := public.catalog_taxonomy_filter_slugs(p_taxonomy_slug);
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb,
      'has_more', false,
      'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_footwear_taxonomy_browse_page')
    );
  END IF;

  WITH eligible AS (
    SELECT DISTINCT pta.offer_id
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_slug = ANY(slugs)
  ),
  filtered AS (
    SELECT f.*
    FROM public.live_products_footwear f
    JOIN eligible e ON e.offer_id = f.id
    WHERE lower(coalesce(f.region, '')) = reg
      AND (p_brand_slug IS NULL OR btrim(p_brand_slug) = ''
        OR lower(coalesce(f.brand_slug, '')) = lower(btrim(p_brand_slug)))
      AND (p_color IS NULL OR btrim(p_color) = ''
        OR lower(coalesce(f.color, '')) = lower(btrim(p_color)))
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR lower(coalesce(f.name, '')) LIKE '%' || lower(btrim(p_search)) || '%'
      )
      AND (
        p_min_price IS NULL
        OR coalesce(f.price_numeric, public.catalog_product_price_numeric(f.price::text)) >= p_min_price
      )
      AND (
        p_max_price IS NULL
        OR coalesce(f.price_numeric, public.catalog_product_price_numeric(f.price::text)) <= p_max_price
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS n FROM filtered
  ),
  paged AS (
    SELECT fl.*
    FROM filtered fl
    ORDER BY
      fl.natural_fiber_percent DESC NULLS LAST,
      fl.created_at DESC NULLS LAST,
      fl.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT c.n,
    coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more
  FROM counted c
  LEFT JOIN LATERAL (SELECT * FROM paged LIMIT lim) p ON true
  GROUP BY c.n;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'exact',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_footwear_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_browse_page(text, text, text, text, text, int, text, text, text, numeric, numeric, text, int, int)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_footwear_taxonomy_browse_page(text, text, text, text, text, numeric, numeric, text, int, int)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

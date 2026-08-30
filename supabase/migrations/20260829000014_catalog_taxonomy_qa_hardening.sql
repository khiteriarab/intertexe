-- QA hardening: deactivate leaf menus, close coverage gaps, card-level VIEW N dedupe.
-- Do NOT deploy app until precision QA passes.

-- -----------------------------------------------------------------------------
-- 1) Hide all customer-facing category nodes until precision QA passes.
--    Keep department landing menus only (clothing/all, shoes/all are not menu rows).
--    Ballet Flats explicitly hidden while alias investigation continues.
-- -----------------------------------------------------------------------------
UPDATE public.catalog_taxonomy_nodes
SET is_active = false, updated_at = now()
WHERE slug NOT IN ('clothing/all', 'shoes/all');

UPDATE public.catalog_taxonomy_nodes
SET is_active = false, min_count_threshold = 0, updated_at = now()
WHERE slug = 'shoes/ballet-flats';

-- Remap any ballet-flat assignments to flat-shoes parent during investigation.
UPDATE public.product_taxonomy_assignments
SET taxonomy_slug = 'shoes/flat-shoes', updated_at = now()
WHERE taxonomy_slug = 'shoes/ballet-flats'
  AND taxonomy_version = 'retail-v1';

-- -----------------------------------------------------------------------------
-- 2) Inference gaps: other_apparel/bottoms, jumpsuits, footwear aliases, fallbacks
-- -----------------------------------------------------------------------------
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
  is_jean boolean := (gt = 'pants_trousers' OR gt = 'other_apparel' OR cat ~ 'bottom' OR cat ~ 'denim' OR cat ~ 'jean')
    AND (nam ~ 'jean' OR cat ~ 'denim' OR nam ~ 'denim')
    AND NOT is_skirt AND NOT is_jacket;
  is_trouser boolean := (gt = 'pants_trousers' OR gt = 'other_apparel' OR cat ~ 'bottom')
    AND (nam ~ 'trouser|pant|cargo|straight|wide leg|flare|jogger|legging|chino|slack' OR cat ~ 'bottom|trouser|pant')
    AND NOT is_jean;
  is_shirt boolean := gt = 'shirts'
    OR ((cat ~ 'shirt' OR nam ~ '\bshirt\b') AND cat !~ 't-shirt' AND nam !~ 't-shirt' AND nam !~ 'shirtdress');
  is_blouse boolean := gt = 'tops_blouses' AND (cat ~ 'blouse' OR nam ~ '\bblouse\b');
  is_tank boolean := gt IN ('tops_blouses', 'shirts', 'tanks', 'camisoles')
    AND NOT is_dress
    AND (cat ~ 'camisole' OR cat ~ 'tank' OR cat ~ 'lingerie' OR nam ~ '\btank\b' OR nam ~ '\bcamisole\b' OR nam ~ '\bcami\b' OR nam ~ '\bbra\b')
    AND nam !~ '\bdress\b';
  is_bridal boolean := is_dress AND (nam ~ 'bridal' OR nam ~ 'wedding' OR nam ~ '\bbride\b');
  is_knit boolean := gt IN ('knitwear', 'sweaters_cardigans');
  is_short boolean := gt = 'shorts';
  is_set boolean := gt = 'matching_sets' OR cat ~ 'co-ord' OR cat ~ 'coord' OR cat ~ 'two piece'
    OR nam ~ 'matching set' OR nam ~ 'co-ord';
  is_swim boolean := gt = 'swim_resortwear' OR cat ~ 'swim' OR cat ~ 'bikini' OR nam ~ 'swimwear';
  is_jumpsuit boolean := gt = 'jumpsuits' OR nam ~ 'jumpsuit' OR nam ~ 'romper' OR nam ~ 'playsuit';
BEGIN
  IF is_bridal THEN slug := 'clothing/bridal-dresses'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_jumpsuit THEN slug := 'clothing/dresses'; confidence := 78; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_dress THEN slug := 'clothing/dresses'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jean THEN slug := 'clothing/jeans'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_trouser THEN slug := 'clothing/trousers'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_skirt THEN slug := 'clothing/skirts'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_short THEN slug := 'clothing/shorts'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jacket THEN slug := 'clothing/jackets'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_coat THEN slug := 'clothing/coats'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_knit THEN slug := 'clothing/knitwear'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_set THEN slug := 'clothing/matching-sets'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_swim THEN slug := 'clothing/swimwear'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_shirt AND NOT is_blouse AND NOT is_tank THEN slug := 'clothing/shirts'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_blouse THEN slug := 'clothing/blouses'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_tank THEN slug := 'clothing/tanks-and-camisoles'; confidence := 84; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF gt = 'tops_blouses' OR gt = 'shirts' THEN slug := 'clothing/shirts'; confidence := 72; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF gt IN ('other_apparel') OR gt IS NULL OR btrim(gt) = '' THEN
    IF cat ~ 'bottom' THEN slug := 'clothing/trousers'; confidence := 70; source := 'retailer_category'; RETURN NEXT; RETURN; END IF;
    IF cat ~ 'lingerie' THEN slug := 'clothing/tanks-and-camisoles'; confidence := 55; source := 'retailer_category'; RETURN NEXT; RETURN; END IF;
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
  is_sneaker boolean := nam ~ 'sneaker' OR nam ~ 'trainer' OR nam ~ 'ballet runner' OR nam ~ 'runner 2';
  is_loafer boolean := nam ~ 'loafer' OR nam ~ 'penny' OR nam ~ 'driving shoe' OR nam ~ 'driving moccasin' OR nam ~ 'boat shoe' OR nam ~ 'deck shoe';
  is_mary boolean := nam ~ 'mary[\s-]?jane';
  is_ballet boolean := (nam ~ 'ballet[\s-]?flat' OR nam ~ 'ballerina' OR nam ~ 'ballerinas' OR (nam ~ 'ballet' AND nam ~ 'flat'))
    AND NOT is_sneaker;
  is_espadrille boolean := nam ~ 'espadrille';
  is_ankle boolean := nam ~ 'ankle boot' OR nam ~ 'bootie' OR nam ~ 'ankle-boot';
  is_boot boolean := (nam ~ 'boot' OR nam ~ 'bootie') AND NOT is_sneaker AND nam !~ 'bootcut';
  is_pump boolean := nam ~ 'pump' OR nam ~ 'stiletto';
  is_mule boolean := nam ~ 'mule';
  is_sandal boolean := nam ~ 'sandal' OR nam ~ 'slide' OR nam ~ 'flip flop';
  is_heeled_sandal boolean := is_sandal AND (nam ~ 'heeled' OR nam ~ 'heel' OR nam ~ 'wedge' OR nam ~ '[0-9]+ mm');
BEGIN
  IF is_sneaker THEN slug := 'shoes/sneakers'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mary THEN slug := 'shoes/mary-janes'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ballet THEN slug := 'shoes/flat-shoes'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_espadrille THEN slug := 'shoes/sandals'; confidence := 84; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ankle THEN slug := 'shoes/ankle-boots'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_boot THEN slug := 'shoes/boots'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_pump THEN slug := 'shoes/pumps'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_heeled_sandal THEN slug := 'shoes/heeled-sandals'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mule THEN slug := 'shoes/mules'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_loafer THEN slug := 'shoes/loafers'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_sandal THEN slug := 'shoes/sandals'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF cat ~ 'shoe' OR cat ~ 'footwear' OR cat ~ 'sandal' THEN
    slug := 'shoes/sandals'; confidence := 60; source := 'retailer_category'; RETURN NEXT; RETURN;
  END IF;
  slug := 'shoes/sandals'; confidence := 55; source := 'retailer_category'; RETURN NEXT;
END;
$$;

-- Backfill: process offers missing a department leaf assignment (not only wholly unassigned).
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
  slug_prefix text := lower(trim(p_department)) || '/%';
BEGIN
  IF lower(trim(p_department)) = 'clothing' THEN
    WITH batch AS (
      SELECT l.id, l.garment_type, l.category, l.name
      FROM public.live_products_apparel l
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_taxonomy_assignments pta
        WHERE pta.offer_id = l.id
          AND pta.taxonomy_version = p_taxonomy_version
          AND pta.taxonomy_slug LIKE slug_prefix
          AND pta.taxonomy_slug <> 'clothing/all'
      )
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
      ON CONFLICT (offer_id, taxonomy_slug) DO UPDATE SET
        is_primary = EXCLUDED.is_primary,
        source = EXCLUDED.source,
        confidence = EXCLUDED.confidence,
        updated_at = now()
      RETURNING offer_id
    )
    SELECT count(*)::int INTO n FROM ins;
  ELSIF lower(trim(p_department)) = 'shoes' THEN
    WITH batch AS (
      SELECT f.id, f.category, f.name
      FROM public.live_products_footwear f
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_taxonomy_assignments pta
        WHERE pta.offer_id = f.id
          AND pta.taxonomy_version = p_taxonomy_version
          AND pta.taxonomy_slug LIKE slug_prefix
          AND pta.taxonomy_slug <> 'shoes/all'
      )
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
      ON CONFLICT (offer_id, taxonomy_slug) DO UPDATE SET
        is_primary = EXCLUDED.is_primary,
        source = EXCLUDED.source,
        confidence = EXCLUDED.confidence,
        updated_at = now()
      RETURNING offer_id
    )
    SELECT count(*)::int INTO n FROM ins;
  END IF;
  RETURN coalesce(n, 0);
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Card-level counts (VIEW N = unique paginatable style cards, not offer rows)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_card_key(
  p_canonical_id uuid,
  p_image_url text,
  p_brand_name text,
  p_name text,
  p_composition text,
  p_product_id text,
  p_offer_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(
    p_canonical_id::text,
    public.catalog_dedupe_key(p_image_url, p_brand_name, p_name, p_composition, p_product_id, p_offer_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.catalog_taxonomy_node_counts(
  p_department text,
  p_region text DEFAULT 'us'
)
RETURNS TABLE (slug text, live_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dept AS (
    SELECT n.slug FROM public.catalog_taxonomy_nodes n
    WHERE n.department = lower(trim(p_department))
  ),
  apparel_cards AS (
    SELECT
      pta.taxonomy_slug,
      public.catalog_taxonomy_card_key(
        p.canonical_id, l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
      ) AS card_key
    FROM public.product_taxonomy_assignments pta
    JOIN public.live_products_apparel l ON l.id = pta.offer_id
    JOIN public.products p ON p.id = l.id
    WHERE pta.taxonomy_version = 'retail-v1'
      AND lower(coalesce(l.region, '')) = lower(trim(coalesce(p_region, 'us')))
  ),
  footwear_cards AS (
    SELECT
      pta.taxonomy_slug,
      public.catalog_taxonomy_card_key(
        p.canonical_id, f.image_url, f.brand_name, f.name, f.composition, f.product_id, f.id
      ) AS card_key
    FROM public.product_taxonomy_assignments pta
    JOIN public.live_products_footwear f ON f.id = pta.offer_id
    JOIN public.products p ON p.id = f.id
    WHERE pta.taxonomy_version = 'retail-v1'
      AND lower(coalesce(f.region, '')) = lower(trim(coalesce(p_region, 'us')))
  ),
  cards AS (
    SELECT * FROM apparel_cards WHERE lower(trim(p_department)) = 'clothing'
    UNION ALL
    SELECT * FROM footwear_cards WHERE lower(trim(p_department)) = 'shoes'
  )
  SELECT
    d.slug,
    coalesce((
      SELECT count(DISTINCT c.card_key)::bigint
      FROM cards c
      WHERE c.taxonomy_slug = ANY(public.catalog_taxonomy_filter_slugs(d.slug))
    ), 0)::bigint AS live_count
  FROM dept d;
$$;

-- Apparel browse with card dedupe (regional winner per card_key)
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
      'products', '[]'::jsonb, 'has_more', false, 'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_taxonomy_browse_page')
    );
  END IF;

  WITH eligible AS (
    SELECT DISTINCT pta.offer_id
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_version = 'retail-v1'
      AND pta.taxonomy_slug = ANY(slugs)
  ),
  base AS (
    SELECT
      l.*,
      public.catalog_taxonomy_card_key(
        p.canonical_id, l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
      ) AS card_key
    FROM public.live_products_apparel l
    JOIN public.products p ON p.id = l.id
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
      AND (p_min_price IS NULL OR public.catalog_product_price_numeric(l.price::text) >= p_min_price)
      AND (p_max_price IS NULL OR public.catalog_product_price_numeric(l.price::text) <= p_max_price)
      AND (p_min_nfp IS NULL OR coalesce(l.natural_fiber_percent, 0) >= p_min_nfp)
      AND (
        p_material_family IS NULL OR btrim(p_material_family) = ''
        OR lower(coalesce(l.fiber_primary, '')) = lower(btrim(p_material_family))
        OR lower(coalesce(l.composition, '')) LIKE '%' || lower(btrim(p_material_family)) || '%'
      )
  ),
  winners AS (
    SELECT b.*
    FROM (
      SELECT b.*,
        row_number() OVER (
          PARTITION BY b.card_key
          ORDER BY b.natural_fiber_percent DESC NULLS LAST, b.created_at DESC NULLS LAST, b.id DESC
        ) AS card_rank
      FROM base b
    ) b
    WHERE b.card_rank = 1
  ),
  counted AS (SELECT count(*)::bigint AS n FROM winners),
  paged AS (
    SELECT w.*
    FROM winners w
    ORDER BY
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_asc', 'price-low') THEN
        public.catalog_product_price_numeric(w.price::text) END ASC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_desc', 'price-high') THEN
        public.catalog_product_price_numeric(w.price::text) END DESC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) = 'most_natural' THEN w.natural_fiber_percent END DESC NULLS LAST,
      w.is_editor_pick DESC NULLS LAST,
      w.created_at DESC NULLS LAST,
      w.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT c.n,
    coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM paged LIMIT lim) p), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more
  FROM counted c;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'exact',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug,
      'count_basis', 'deduped_card'
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
      'products', '[]'::jsonb, 'has_more', false, 'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_footwear_taxonomy_browse_page')
    );
  END IF;

  WITH eligible AS (
    SELECT DISTINCT pta.offer_id
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_version = 'retail-v1'
      AND pta.taxonomy_slug = ANY(slugs)
  ),
  base AS (
    SELECT
      f.*,
      public.catalog_taxonomy_card_key(
        p.canonical_id, f.image_url, f.brand_name, f.name, f.composition, f.product_id, f.id
      ) AS card_key
    FROM public.live_products_footwear f
    JOIN public.products p ON p.id = f.id
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
      AND (p_min_price IS NULL OR public.catalog_product_price_numeric(f.price::text) >= p_min_price)
      AND (p_max_price IS NULL OR public.catalog_product_price_numeric(f.price::text) <= p_max_price)
  ),
  winners AS (
    SELECT b.*
    FROM (
      SELECT b.*,
        row_number() OVER (
          PARTITION BY b.card_key
          ORDER BY b.natural_fiber_percent DESC NULLS LAST, b.created_at DESC NULLS LAST, b.id DESC
        ) AS card_rank
      FROM base b
    ) b
    WHERE b.card_rank = 1
  ),
  counted AS (SELECT count(*)::bigint AS n FROM winners),
  paged AS (
    SELECT w.*
    FROM winners w
    ORDER BY
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_asc', 'price-low') THEN
        public.catalog_product_price_numeric(w.price::text) END ASC NULLS LAST,
      CASE WHEN lower(coalesce(p_sort, 'newest')) IN ('price_desc', 'price-high') THEN
        public.catalog_product_price_numeric(w.price::text) END DESC NULLS LAST,
      w.natural_fiber_percent DESC NULLS LAST,
      w.created_at DESC NULLS LAST,
      w.id DESC
    LIMIT lim + 1 OFFSET off
  )
  SELECT c.n,
    coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM paged LIMIT lim) p), '[]'::jsonb),
    (SELECT count(*) > lim FROM paged)
  INTO total_n, rows, has_more
  FROM counted c;

  RETURN jsonb_build_object(
    'products', coalesce(rows, '[]'::jsonb),
    'has_more', coalesce(has_more, false),
    'total', coalesce(total_n, 0),
    'total_status', 'exact',
    'debug', jsonb_build_object(
      'rpc_version', 'catalog_footwear_taxonomy_browse_page',
      'taxonomy_slug', p_taxonomy_slug,
      'count_basis', 'deduped_card'
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

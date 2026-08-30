-- Restore clothing/all + shoes/all full-catalog browse (regressed by browse_price_hotfix).
-- Also prioritize matching-set inference before dress when name/category signals a set.

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
  is_set boolean := gt = 'matching_sets' OR cat ~ 'co-ord' OR cat ~ 'coord' OR cat ~ 'two piece'
    OR nam ~ 'matching set' OR nam ~ 'co-ord' OR nam ~ 'two piece set' OR nam ~ 'two-piece set';
  is_dress boolean := NOT is_set AND (
    gt = 'dresses' OR (cat ~ '(^|[^a-z])dress([^a-z]|$)' AND cat !~ 'shirtdress')
    OR (nam ~ '(^|[^a-z])dress([^a-z]|$)' AND nam !~ 'shirtdress' AND nam !~ 'jumpsuit' AND nam !~ 'romper')
  );
  is_skirt boolean := gt = 'skirts' OR cat ~ 'skirt' OR nam ~ '(^|[^a-z])skirt([^a-z]|$)';
  is_jacket boolean := gt = 'jackets_blazers' OR cat ~ 'jacket' OR cat ~ 'blazer'
    OR nam ~ 'jacket' OR nam ~ 'blazer';
  is_coat boolean := gt = 'coats' OR (cat ~ 'coat' AND NOT is_jacket) OR nam ~ '(^|[^a-z])coat([^a-z]|$)';
  is_jean boolean := gt = 'pants_trousers'
    AND (nam ~ 'jean' OR cat ~ 'denim' OR nam ~ 'denim')
    AND NOT is_skirt AND NOT is_jacket;
  is_trouser boolean := gt = 'pants_trousers'
    AND (nam ~ 'trouser' OR cat ~ 'trouser' OR nam ~ '(^|[^a-z])pant([^a-z]|$)' OR cat ~ '(^|[^a-z])pant([^a-z]|$)')
    AND NOT is_jean;
  is_shirt boolean := gt = 'shirts'
    OR ((cat ~ 'shirt' OR nam ~ '(^|[^a-z])shirt([^a-z]|$)') AND cat !~ 't-shirt' AND nam !~ 't-shirt' AND nam !~ 'shirtdress');
  is_blouse boolean := gt = 'tops_blouses' AND (cat ~ 'blouse' OR nam ~ 'blouse');
  is_tank boolean := gt IN ('tops_blouses', 'shirts', 'tanks', 'camisoles')
    AND NOT is_dress
    AND (cat ~ 'camisole' OR cat ~ 'tank' OR nam ~ 'tank' OR nam ~ 'camisole' OR nam ~ 'cami')
    AND nam !~ 'dress' AND cat !~ 'lingerie';
  is_bridal boolean := is_dress AND (nam ~ 'bridal' OR nam ~ 'wedding' OR nam ~ 'bride');
  is_knit boolean := gt IN ('knitwear', 'sweaters_cardigans');
  is_short boolean := gt = 'shorts';
  is_swim boolean := gt = 'swim_resortwear' OR cat ~ 'swim' OR cat ~ 'bikini' OR nam ~ 'swimwear';
  is_jumpsuit boolean := gt = 'jumpsuits' OR nam ~ 'jumpsuit' OR nam ~ 'romper' OR nam ~ 'playsuit';
  is_lingerie boolean := cat ~ 'lingerie' OR nam ~ 'lingerie' OR nam ~ '(^|[^a-z])bra([^a-z]|$)';
  is_sleepwear boolean := gt = 'sleepwear' OR cat ~ 'sleepwear' OR cat ~ 'pajama' OR cat ~ 'pyjama'
    OR nam ~ 'pajama' OR nam ~ 'pyjama' OR nam ~ 'nightdress' OR nam ~ 'nightgown';
  is_generic_bottom boolean := (gt = 'other_apparel' OR gt IS NULL OR btrim(gt) = '')
    AND cat ~ 'bottom' AND NOT is_jean AND NOT is_trouser AND NOT is_short;
BEGIN
  IF is_jumpsuit THEN slug := 'clothing/jumpsuits'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_lingerie THEN slug := 'clothing/lingerie'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_sleepwear THEN slug := 'clothing/sleepwear'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_generic_bottom THEN slug := 'clothing/bottoms'; confidence := 72; source := 'retailer_category'; RETURN NEXT; RETURN; END IF;
  IF is_set THEN slug := 'clothing/matching-sets'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_bridal THEN slug := 'clothing/bridal-dresses'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_dress THEN slug := 'clothing/dresses'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jean THEN slug := 'clothing/jeans'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_trouser THEN slug := 'clothing/trousers'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_skirt THEN slug := 'clothing/skirts'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_short THEN slug := 'clothing/shorts'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jacket THEN slug := 'clothing/jackets'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_coat THEN slug := 'clothing/coats'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_knit THEN slug := 'clothing/knitwear'; confidence := 90; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_swim THEN slug := 'clothing/swimwear'; confidence := 85; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_shirt AND NOT is_blouse AND NOT is_tank THEN slug := 'clothing/shirts'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_blouse THEN slug := 'clothing/blouses'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_tank THEN slug := 'clothing/tanks-and-camisoles'; confidence := 84; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF gt = 'tops_blouses' OR gt = 'shirts' THEN slug := 'clothing/shirts'; confidence := 72; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  RETURN;
END;
$$;

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
  is_all boolean := lower(trim(coalesce(p_taxonomy_slug, ''))) = 'clothing/all';
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF NOT is_all AND (slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0) THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb, 'has_more', false, 'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_taxonomy_browse_page')
    );
  END IF;

  WITH base AS (
    SELECT
      l.*,
      public.catalog_taxonomy_card_key(
        p.canonical_id, l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id
      ) AS card_key
    FROM public.live_products_apparel l
    JOIN public.products p ON p.id = l.id
    WHERE lower(coalesce(l.region, '')) = reg
      AND (
        is_all
        OR EXISTS (
          SELECT 1 FROM public.product_taxonomy_assignments pta
          WHERE pta.offer_id = l.id
            AND pta.taxonomy_version = 'retail-v1'
            AND pta.is_primary IS TRUE
            AND pta.taxonomy_slug = ANY(slugs)
        )
      )
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
    SELECT w.* FROM winners w
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
      'count_basis', 'deduped_card',
      'scope', CASE WHEN is_all THEN 'full_live_catalog' ELSE 'leaf_assignment' END
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
  is_all boolean := lower(trim(coalesce(p_taxonomy_slug, ''))) = 'shoes/all';
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  off int := greatest(coalesce(p_offset, 0), 0);
  total_n bigint;
  rows jsonb;
  has_more boolean;
BEGIN
  IF NOT is_all AND (slugs IS NULL OR coalesce(array_length(slugs, 1), 0) = 0) THEN
    RETURN jsonb_build_object(
      'products', '[]'::jsonb, 'has_more', false, 'total', 0,
      'total_status', 'exact',
      'debug', jsonb_build_object('rpc_version', 'catalog_footwear_taxonomy_browse_page')
    );
  END IF;

  WITH base AS (
    SELECT
      f.*,
      public.catalog_taxonomy_card_key(
        p.canonical_id, f.image_url, f.brand_name, f.name, f.composition, f.product_id, f.id
      ) AS card_key
    FROM public.live_products_footwear f
    JOIN public.products p ON p.id = f.id
    WHERE lower(coalesce(f.region, '')) = reg
      AND (
        is_all
        OR EXISTS (
          SELECT 1 FROM public.product_taxonomy_assignments pta
          WHERE pta.offer_id = f.id
            AND pta.taxonomy_version = 'retail-v1'
            AND pta.is_primary IS TRUE
            AND pta.taxonomy_slug = ANY(slugs)
        )
      )
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
    SELECT w.* FROM winners w
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
      'count_basis', 'deduped_card',
      'scope', CASE WHEN is_all THEN 'full_live_catalog' ELSE 'leaf_assignment' END
    )
  );
END;
$$;

-- Reassign matching-set offers that were previously routed to dresses.
WITH candidates AS (
  SELECT l.id AS offer_id
  FROM public.live_products_apparel l
  WHERE lower(coalesce(l.region, '')) = 'us'
    AND (
      lower(coalesce(l.name, '')) ~ 'matching set|co-ord|two piece set|two-piece set'
      OR lower(coalesce(l.category, '')) ~ 'co-ord|coord|two piece'
    )
),
upserted AS (
  INSERT INTO public.product_taxonomy_assignments (
    offer_id, taxonomy_slug, is_primary, source, confidence, taxonomy_version
  )
  SELECT c.offer_id, 'clothing/matching-sets', true, 'guarded_rule', 85, 'retail-v1'
  FROM candidates c
  ON CONFLICT (offer_id, taxonomy_slug) DO UPDATE SET
    is_primary = true,
    source = EXCLUDED.source,
    confidence = EXCLUDED.confidence,
    updated_at = now()
)
UPDATE public.product_taxonomy_assignments pta
SET is_primary = false, updated_at = now()
FROM candidates c
WHERE pta.offer_id = c.offer_id
  AND pta.taxonomy_version = 'retail-v1'
  AND pta.is_primary IS TRUE
  AND pta.taxonomy_slug <> 'clothing/matching-sets';

NOTIFY pgrst, 'reload schema';

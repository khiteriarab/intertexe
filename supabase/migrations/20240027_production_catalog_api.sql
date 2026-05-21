-- =============================================================================
-- Production catalog_list / catalog_list_count RPCs
-- Material + garment inheritance, canonical card dedupe, paginated reads.
-- Apply after 20240021–20240026. Safe to re-run (CREATE OR REPLACE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shop slug → DB classification enums
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_shop_fiber_to_material(p_fiber text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  f text := lower(trim(coalesce(p_fiber, '')));
BEGIN
  IF f = '' OR f = 'all' THEN RETURN NULL; END IF;
  IF f IN ('silk', 'linen', 'cotton', 'wool', 'cashmere') THEN RETURN f; END IF;
  IF f IN ('leather', 'leather-suede', 'leather_suede', 'suede') THEN RETURN 'leather_suede'; END IF;
  IF f IN ('denim', 'jeans', 'jean') THEN RETURN NULL; END IF;
  RETURN f;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_shop_category_garment_types(p_category text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  c text := lower(trim(coalesce(p_category, '')));
BEGIN
  IF c = '' OR c = 'all' THEN RETURN NULL; END IF;
  CASE c
    WHEN 'dresses' THEN RETURN ARRAY['dresses']::text[];
    WHEN 'tops' THEN RETURN ARRAY['tops_blouses', 'shirts']::text[];
    WHEN 'knitwear' THEN RETURN ARRAY['knitwear', 'sweaters_cardigans']::text[];
    WHEN 'bottoms' THEN RETURN ARRAY['pants_trousers', 'shorts']::text[];
    WHEN 'outerwear' THEN RETURN ARRAY['coats', 'jackets_blazers']::text[];
    WHEN 'skirts' THEN RETURN ARRAY['skirts']::text[];
    WHEN 'swimwear' THEN RETURN ARRAY['swim_resortwear']::text[];
    WHEN 'lingerie' THEN RETURN ARRAY['other_apparel']::text[];
    ELSE RETURN ARRAY[c]::text[];
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_shop_fiber_matches_row(
  p_fiber text,
  p_material_primary text,
  p_garment_type text,
  p_category text,
  p_name text,
  p_composition text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  f text := lower(trim(coalesce(p_fiber, '')));
  mat text := lower(trim(coalesce(p_material_primary, '')));
  cat text := lower(trim(coalesce(p_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
  comp text := lower(trim(coalesce(p_composition, '')));
  mapped text;
BEGIN
  IF f = '' OR f = 'all' THEN RETURN true; END IF;

  IF f IN ('denim', 'jeans', 'jean') THEN
    RETURN cat ~ '(denim|jean)' OR nam ~ '(denim|jean)' OR comp ~ '(denim|jean)';
  END IF;

  mapped := public.catalog_shop_fiber_to_material(f);
  IF mapped IS NOT NULL THEN
    RETURN mat = mapped;
  END IF;

  RETURN comp LIKE '%' || f || '%' OR cat LIKE '%' || f || '%' OR nam LIKE '%' || f || '%';
END;
$$;

-- -----------------------------------------------------------------------------
-- Classify unclassified live offers (batch job for API / SQL Editor)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.swoop_classify_offers_batch(p_limit int DEFAULT 3000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  WITH batch AS (
    SELECT l.*
    FROM public.live_products_apparel l
    LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
    WHERE c.offer_id IS NULL
    LIMIT greatest(1, least(p_limit, 10000))
  ),
  ins AS (
    INSERT INTO public.product_offer_classification (
      offer_id,
      material_primary,
      material_tags,
      garment_type,
      completeness_status,
      needs_review_reason,
      inferred_rail_keys,
      classifier_version,
      classified_at
    )
    SELECT
      b.id,
      public.catalog_classify_material(b.composition, b.material_metadata),
      ARRAY[public.catalog_classify_material(b.composition, b.material_metadata)]::text[],
      public.catalog_classify_garment(b.category, b.name),
      public.catalog_offer_completeness_status(
        b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
      ),
      public.catalog_offer_needs_review_reason(
        b.category, b.name, b.composition, b.image_url, b.price, b.url, b.currency
      ),
      public.catalog_infer_rail_keys(
        public.catalog_classify_material(b.composition, b.material_metadata),
        b.collection_slugs,
        b.is_sale,
        b.brand_slug,
        b.created_at,
        coalesce(
          (public.catalog_parse_composition_material(b.composition, b.material_metadata)->>'needs_material_review')::boolean,
          true
        )
      ),
      'v2-body',
      now()
    FROM batch b
    ON CONFLICT (offer_id) DO UPDATE SET
      material_primary = EXCLUDED.material_primary,
      material_tags = EXCLUDED.material_tags,
      garment_type = EXCLUDED.garment_type,
      completeness_status = EXCLUDED.completeness_status,
      needs_review_reason = EXCLUDED.needs_review_reason,
      inferred_rail_keys = EXCLUDED.inferred_rail_keys,
      classifier_version = EXCLUDED.classifier_version,
      classified_at = now()
    RETURNING offer_id
  )
  SELECT count(*)::int INTO n FROM ins;
  RETURN coalesce(n, 0);
END;
$$;

-- -----------------------------------------------------------------------------
-- catalog_list — deduped cards, material + garment filters, pagination
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_list(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_nfp int DEFAULT 80,
  p_limit int DEFAULT 60,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.live_products_apparel
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      l.*,
      coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata)) AS mat_primary,
      coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name)) AS garment,
      coalesce(
        c.completeness_status,
        public.catalog_offer_completeness_status(
          l.category, l.name, l.composition, l.image_url, l.price, l.url, l.currency
        )
      ) AS comp_status,
      coalesce(
        p.canonical_id::text,
        public.catalog_dedupe_key(l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id)
      ) AS card_key
    FROM public.live_products_apparel l
    JOIN public.products p ON p.id = l.id
    LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
    WHERE coalesce(l.natural_fiber_percent, 0) >= greatest(0, least(coalesce(p_min_nfp, 80), 100))
      AND (p_brand_slug IS NULL OR trim(p_brand_slug) = '' OR l.brand_slug = lower(trim(p_brand_slug)))
      AND (
        p_search IS NULL OR trim(p_search) = ''
        OR l.name ILIKE '%' || trim(p_search) || '%'
        OR l.brand_name ILIKE '%' || trim(p_search) || '%'
        OR l.composition ILIKE '%' || trim(p_search) || '%'
      )
      AND public.catalog_shop_fiber_matches_row(
        p_fiber, coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata)),
        coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name)),
        l.category, l.name, l.composition
      )
      AND (
        public.catalog_shop_category_garment_types(p_category) IS NULL
        OR coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name))
           = ANY (public.catalog_shop_category_garment_types(p_category))
      )
  ),
  eligible AS (
    SELECT
      b.id,
      b.card_key,
      b.region,
      b.natural_fiber_percent,
      b.created_at,
      row_number() OVER (
        PARTITION BY b.card_key
        ORDER BY
          CASE lower(coalesce(b.region, 'us'))
            WHEN lower(coalesce(nullif(trim(p_preferred_region), ''), 'us')) THEN 0
            WHEN lower(coalesce(nullif(trim(p_fallback_region), ''), 'us')) THEN 1
            WHEN 'us' THEN 2
            WHEN 'uk' THEN 3
            WHEN 'eu' THEN 4
            ELSE 5
          END,
          b.natural_fiber_percent DESC NULLS LAST,
          b.created_at DESC NULLS LAST
      ) AS card_rank
    FROM base b
    WHERE b.comp_status = 'complete'
  ),
  winner_ids AS (
    SELECT e.id
    FROM eligible e
    WHERE e.card_rank = 1
    ORDER BY e.natural_fiber_percent DESC NULLS LAST, e.created_at DESC NULLS LAST
    LIMIT greatest(1, least(coalesce(p_limit, 60), 500))
    OFFSET greatest(0, coalesce(p_offset, 0))
  )
  SELECT l.*
  FROM public.live_products_apparel l
  JOIN winner_ids w ON w.id = l.id
  ORDER BY l.natural_fiber_percent DESC NULLS LAST, l.created_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.catalog_list_count(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_nfp int DEFAULT 80
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      l.id,
      coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata)) AS mat_primary,
      coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name)) AS garment,
      coalesce(
        c.completeness_status,
        public.catalog_offer_completeness_status(
          l.category, l.name, l.composition, l.image_url, l.price, l.url, l.currency
        )
      ) AS comp_status,
      coalesce(
        p.canonical_id::text,
        public.catalog_dedupe_key(l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id)
      ) AS card_key,
      l.category,
      l.name,
      l.composition
    FROM public.live_products_apparel l
    JOIN public.products p ON p.id = l.id
    LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
    WHERE coalesce(l.natural_fiber_percent, 0) >= greatest(0, least(coalesce(p_min_nfp, 80), 100))
      AND (p_brand_slug IS NULL OR trim(p_brand_slug) = '' OR l.brand_slug = lower(trim(p_brand_slug)))
      AND (
        p_search IS NULL OR trim(p_search) = ''
        OR l.name ILIKE '%' || trim(p_search) || '%'
        OR l.brand_name ILIKE '%' || trim(p_search) || '%'
        OR l.composition ILIKE '%' || trim(p_search) || '%'
      )
      AND public.catalog_shop_fiber_matches_row(
        p_fiber,
        coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata)),
        coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name)),
        l.category, l.name, l.composition
      )
      AND (
        public.catalog_shop_category_garment_types(p_category) IS NULL
        OR coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name))
           = ANY (public.catalog_shop_category_garment_types(p_category))
      )
  )
  SELECT count(DISTINCT b.card_key)::bigint
  FROM base b
  WHERE b.comp_status = 'complete';
$$;

-- Indexes for catalog queries
CREATE INDEX IF NOT EXISTS product_offer_classification_mat_garment_complete_idx
  ON public.product_offer_classification (material_primary, garment_type)
  WHERE completeness_status = 'complete';

CREATE INDEX IF NOT EXISTS products_active_approved_idx
  ON public.products (brand_slug, updated_at DESC)
  WHERE coalesce(is_active, true) IS TRUE AND approved = 'yes';

GRANT EXECUTE ON FUNCTION public.catalog_list(text, text, text, text, text, text, int, int, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_list_count(text, text, text, text, text, text, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.swoop_classify_offers_batch(int) TO service_role;

COMMENT ON FUNCTION public.catalog_list IS
  'Paginated consumer catalog: material + garment filters, one card per style (canonical/dedupe_key), regional winner.';

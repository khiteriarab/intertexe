-- Root-only assignment model: no forced wrong leaf mappings; 100% All coverage via live catalog browse.
-- Provisional inactive nodes for jumpsuits, lingerie, bottoms, espadrilles.

-- -----------------------------------------------------------------------------
-- Schema extensions
-- -----------------------------------------------------------------------------
ALTER TABLE public.catalog_taxonomy_nodes
  ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT false;

ALTER TABLE public.product_taxonomy_assignments
  DROP CONSTRAINT IF EXISTS product_taxonomy_assignments_source_check;

ALTER TABLE public.product_taxonomy_assignments
  ADD CONSTRAINT product_taxonomy_assignments_source_check CHECK (
    source IN (
      'retailer_category',
      'garment_type',
      'guarded_rule',
      'model_classification',
      'manual_override',
      'root_only'
    )
  );

CREATE TABLE IF NOT EXISTS public.catalog_taxonomy_node_stats_cache (
  slug text NOT NULL REFERENCES public.catalog_taxonomy_nodes (slug) ON DELETE CASCADE,
  region text NOT NULL DEFAULT 'us',
  offer_count bigint NOT NULL DEFAULT 0,
  card_count bigint NOT NULL DEFAULT 0,
  unresolved_leaf_offers bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, region)
);

COMMENT ON TABLE public.catalog_taxonomy_node_stats_cache IS
  'Administrative QA counts — not used for customer category menus. Grids use browse RPC exact deduped totals.';

-- Provisional nodes (inactive, excluded from launch menus)
INSERT INTO public.catalog_taxonomy_nodes (slug, parent_slug, department, label, sort_order, is_active, is_provisional, min_count_threshold)
VALUES
  ('clothing/jumpsuits', NULL, 'clothing', 'Jumpsuits', 105, false, true, 0),
  ('clothing/lingerie', NULL, 'clothing', 'Lingerie', 106, false, true, 0),
  ('clothing/bottoms', NULL, 'clothing', 'Bottoms', 107, false, true, 0),
  ('shoes/espadrilles', NULL, 'shoes', 'Espadrilles', 65, false, true, 0)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  is_provisional = true,
  is_active = false,
  updated_at = now();

UPDATE public.catalog_taxonomy_nodes SET is_provisional = true, is_active = false WHERE slug = 'shoes/ballet-flats';

-- Deactivate all launch leaves pending precision QA (re-activated by script ≥98%)
UPDATE public.catalog_taxonomy_nodes
SET is_active = false, updated_at = now()
WHERE slug NOT LIKE '%/all';

-- -----------------------------------------------------------------------------
-- Inference: no forced jumpsuit→dress, lingerie→tank, generic bottom→trouser, espadrille→loafer/sandal
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
  is_dress boolean := gt = 'dresses' OR (cat ~ '(^|[^a-z])dress([^a-z]|$)' AND cat !~ 'shirtdress')
    OR (nam ~ '(^|[^a-z])dress([^a-z]|$)' AND nam !~ 'shirtdress' AND nam !~ 'jumpsuit' AND nam !~ 'romper');
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
  is_set boolean := gt = 'matching_sets' OR cat ~ 'co-ord' OR cat ~ 'coord' OR cat ~ 'two piece'
    OR nam ~ 'matching set' OR nam ~ 'co-ord';
  is_swim boolean := gt = 'swim_resortwear' OR cat ~ 'swim' OR cat ~ 'bikini' OR nam ~ 'swimwear';
  is_jumpsuit boolean := gt = 'jumpsuits' OR nam ~ 'jumpsuit' OR nam ~ 'romper' OR nam ~ 'playsuit';
  is_lingerie boolean := cat ~ 'lingerie' OR nam ~ 'lingerie' OR nam ~ '(^|[^a-z])bra([^a-z]|$)';
  is_generic_bottom boolean := (gt = 'other_apparel' OR gt IS NULL OR btrim(gt) = '')
    AND cat ~ 'bottom' AND NOT is_jean AND NOT is_trouser AND NOT is_short;
BEGIN
  IF is_jumpsuit THEN slug := 'clothing/jumpsuits'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_lingerie THEN slug := 'clothing/lingerie'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_generic_bottom THEN slug := 'clothing/bottoms'; confidence := 72; source := 'retailer_category'; RETURN NEXT; RETURN; END IF;
  IF is_bridal THEN slug := 'clothing/bridal-dresses'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_dress THEN slug := 'clothing/dresses'; confidence := 92; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
  IF is_jean THEN slug := 'clothing/jeans'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_trouser THEN slug := 'clothing/trousers'; confidence := 88; source := 'garment_type'; RETURN NEXT; RETURN; END IF;
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
  is_loafer boolean := nam ~ 'loafer' OR nam ~ 'penny';
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
  IF is_espadrille THEN slug := 'shoes/espadrilles'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mary THEN slug := 'shoes/mary-janes'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ballet THEN slug := 'shoes/ballet-flats'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_ankle THEN slug := 'shoes/ankle-boots'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_boot THEN slug := 'shoes/boots'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_pump THEN slug := 'shoes/pumps'; confidence := 92; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_heeled_sandal THEN slug := 'shoes/heeled-sandals'; confidence := 82; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_mule THEN slug := 'shoes/mules'; confidence := 90; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_loafer THEN slug := 'shoes/loafers'; confidence := 88; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  IF is_sandal THEN slug := 'shoes/sandals'; confidence := 86; source := 'guarded_rule'; RETURN NEXT; RETURN; END IF;
  RETURN;
END;
$$;

-- Resolve assignment slug: launch leaves only; provisional/unresolved → root-only
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_resolve_assignment_slug(
  p_department text,
  p_inferred_slug text
)
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_inferred_slug IS NULL OR btrim(p_inferred_slug) = '' THEN
      lower(trim(p_department)) || '/all'
    WHEN EXISTS (
      SELECT 1 FROM public.catalog_taxonomy_nodes n
      WHERE n.slug = p_inferred_slug
        AND n.is_provisional IS TRUE
    ) THEN lower(trim(p_department)) || '/all'
    ELSE p_inferred_slug
  END;
$$;

-- Primary assignment backfill: one row per offer (leaf or root-only)
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
  root_slug text := lower(trim(p_department)) || '/all';
BEGIN
  IF lower(trim(p_department)) = 'clothing' THEN
    WITH batch AS (
      SELECT l.id, l.garment_type, l.category, l.name
      FROM public.live_products_apparel l
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_taxonomy_assignments pta
        WHERE pta.offer_id = l.id AND pta.taxonomy_version = p_taxonomy_version AND pta.is_primary IS TRUE
      )
      LIMIT greatest(1, least(coalesce(p_limit, 5000), 20000))
    ),
    resolved AS (
      SELECT
        b.id AS offer_id,
        public.catalog_taxonomy_resolve_assignment_slug('clothing', i.slug) AS slug,
        coalesce(i.confidence, 50)::smallint AS confidence,
        CASE
          WHEN i.slug IS NULL OR public.catalog_taxonomy_resolve_assignment_slug('clothing', i.slug) = root_slug THEN 'root_only'
          ELSE i.source
        END AS source
      FROM batch b
      LEFT JOIN LATERAL (
        SELECT * FROM public.catalog_taxonomy_infer_apparel(b.garment_type, b.category, b.name) LIMIT 1
      ) i ON true
    ),
    ins AS (
      INSERT INTO public.product_taxonomy_assignments (
        offer_id, taxonomy_slug, is_primary, source, confidence, taxonomy_version
      )
      SELECT offer_id, slug, true, source, confidence, p_taxonomy_version
      FROM resolved
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
        WHERE pta.offer_id = f.id AND pta.taxonomy_version = p_taxonomy_version AND pta.is_primary IS TRUE
      )
      LIMIT greatest(1, least(coalesce(p_limit, 5000), 20000))
    ),
    resolved AS (
      SELECT
        b.id AS offer_id,
        public.catalog_taxonomy_resolve_assignment_slug('shoes', i.slug) AS slug,
        coalesce(i.confidence, 50)::smallint AS confidence,
        CASE
          WHEN i.slug IS NULL OR public.catalog_taxonomy_resolve_assignment_slug('shoes', i.slug) = root_slug THEN 'root_only'
          ELSE i.source
        END AS source
      FROM batch b
      LEFT JOIN LATERAL (
        SELECT * FROM public.catalog_taxonomy_infer_footwear(b.category, b.name) LIMIT 1
      ) i ON true
    ),
    ins AS (
      INSERT INTO public.product_taxonomy_assignments (
        offer_id, taxonomy_slug, is_primary, source, confidence, taxonomy_version
      )
      SELECT offer_id, slug, true, source, confidence, p_taxonomy_version
      FROM resolved
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

-- Unresolved-leaf rate for admin reporting
CREATE OR REPLACE FUNCTION public.catalog_taxonomy_unresolved_leaf_stats(
  p_department text,
  p_region text DEFAULT 'us'
)
RETURNS TABLE (
  total_offers bigint,
  root_only_offers bigint,
  launch_leaf_offers bigint,
  unresolved_leaf_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH live AS (
    SELECT l.id
    FROM public.live_products_apparel l
    WHERE lower(trim(p_department)) = 'clothing'
      AND lower(coalesce(l.region, '')) = lower(trim(coalesce(p_region, 'us')))
    UNION ALL
    SELECT f.id
    FROM public.live_products_footwear f
    WHERE lower(trim(p_department)) = 'shoes'
      AND lower(coalesce(f.region, '')) = lower(trim(coalesce(p_region, 'us')))
  ),
  primary_assign AS (
    SELECT pta.offer_id, pta.taxonomy_slug, pta.source
    FROM public.product_taxonomy_assignments pta
    WHERE pta.taxonomy_version = 'retail-v1' AND pta.is_primary IS TRUE
  )
  SELECT
    count(*)::bigint AS total_offers,
    count(*) FILTER (WHERE pa.taxonomy_slug = lower(trim(p_department)) || '/all')::bigint AS root_only_offers,
    count(*) FILTER (
      WHERE pa.taxonomy_slug IS NOT NULL
        AND pa.taxonomy_slug <> lower(trim(p_department)) || '/all'
    )::bigint AS launch_leaf_offers,
    round(
      count(*) FILTER (WHERE pa.taxonomy_slug = lower(trim(p_department)) || '/all')::numeric
      / nullif(count(*), 0),
      4
    ) AS unresolved_leaf_rate
  FROM live lv
  LEFT JOIN primary_assign pa ON pa.offer_id = lv.id;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_resolve_assignment_slug(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_taxonomy_unresolved_leaf_stats(text, text) TO service_role;
GRANT SELECT ON public.catalog_taxonomy_node_stats_cache TO service_role;

-- Wipe assignments for clean root-only re-backfill
DELETE FROM public.product_taxonomy_assignments WHERE taxonomy_version = 'retail-v1';

-- Browse: department /all = full live eligible catalog (100% root coverage); leaves = assignment filter
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

NOTIFY pgrst, 'reload schema';

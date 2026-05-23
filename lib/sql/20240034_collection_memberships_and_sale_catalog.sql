-- =============================================================================
-- Precomputed editorial collection memberships + paginated sale catalog RPCs.
-- Homepage rails stay on homepage_feed_items; full pages use these tables/RPCs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.collection_product_memberships (
  collection_slug text NOT NULL,
  offer_id uuid NOT NULL,
  product_id text,
  rank_score integer NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_slug, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_memberships_slug_rank
  ON public.collection_product_memberships (collection_slug, rank_score DESC, offer_id);

CREATE INDEX IF NOT EXISTS idx_collection_memberships_refreshed
  ON public.collection_product_memberships (refreshed_at DESC);

COMMENT ON TABLE public.collection_product_memberships IS
  'Precomputed eligible products per editorial collection world. Refreshed by scripts/refresh-collection-memberships.ts';

-- -----------------------------------------------------------------------------
-- Paginated collection catalog (full depth, not shallow pool)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collection_catalog_list(
  p_slug text,
  p_limit int DEFAULT 48,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.live_products_apparel
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.*
  FROM public.collection_product_memberships m
  INNER JOIN public.live_products_apparel l ON l.id = m.offer_id
  WHERE m.collection_slug = lower(trim(p_slug))
  ORDER BY m.rank_score DESC, m.offer_id
  LIMIT greatest(1, least(coalesce(p_limit, 48), 100))
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.collection_catalog_count(p_slug text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.collection_product_memberships m
  INNER JOIN public.live_products_apparel l ON l.id = m.offer_id
  WHERE m.collection_slug = lower(trim(p_slug));
$$;

-- -----------------------------------------------------------------------------
-- Sale catalog (consumer-scoped, markdown only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_offer_is_on_sale(
  p_is_sale boolean,
  p_price text,
  p_original_price text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN coalesce(p_is_sale, false) THEN true
  ELSE
    coalesce(
      nullif(regexp_replace(coalesce(p_original_price, ''), '[^0-9.]', '', 'g'), '')::numeric,
      0
    ) > coalesce(
      nullif(regexp_replace(coalesce(p_price, ''), '[^0-9.]', '', 'g'), '')::numeric,
      0
    )
    AND coalesce(
      nullif(regexp_replace(coalesce(p_price, ''), '[^0-9.]', '', 'g'), '')::numeric,
      0
    ) > 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.sale_catalog_list(
  p_preferred_region text DEFAULT 'us',
  p_fallback_region text DEFAULT 'us',
  p_fiber text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit int DEFAULT 48,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.live_products_apparel
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT l.*,
      public.catalog_region_rank(l.region, coalesce(nullif(trim(p_preferred_region), ''), 'us')) AS pref_rank,
      public.catalog_region_rank(l.region, coalesce(nullif(trim(p_fallback_region), ''), 'us')) AS fall_rank
    FROM public.live_products_apparel l
    WHERE coalesce(l.natural_fiber_percent, 0) >= 80
      AND public.catalog_offer_is_on_sale(l.is_sale, l.price::text, l.original_price::text)
      AND (
        p_fiber IS NULL OR btrim(p_fiber) IN ('', 'all')
        OR public.catalog_fiber_filter_pass(
          p_fiber,
          (SELECT c.material_primary FROM public.product_offer_classification c WHERE c.offer_id = l.id LIMIT 1),
          l.category,
          l.name,
          l.composition
        )
      )
      AND (
        p_max_price IS NULL
        OR coalesce(nullif(regexp_replace(coalesce(l.price::text, ''), '[^0-9.]', '', 'g'), '')::numeric, 999999) <= p_max_price
      )
  ),
  deduped AS (
    SELECT DISTINCT ON (
      lower(trim(coalesce(brand_slug, ''))),
      lower(trim(regexp_replace(coalesce(name, ''), '\s*[-–]\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum).*$', '', 'i')))
    )
      s.*
    FROM scoped s
    ORDER BY
      lower(trim(coalesce(brand_slug, ''))),
      lower(trim(regexp_replace(coalesce(name, ''), '\s*[-–]\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum).*$', '', 'i'))),
      pref_rank,
      fall_rank,
      natural_fiber_percent DESC NULLS LAST,
      created_at DESC NULLS LAST
  )
  SELECT d.*
  FROM deduped d
  ORDER BY d.natural_fiber_percent DESC NULLS LAST, d.created_at DESC NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 48), 100))
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.sale_catalog_count(
  p_fiber text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT l.id,
      lower(trim(coalesce(l.brand_slug, ''))) AS b,
      lower(trim(regexp_replace(coalesce(l.name, ''), '\s*[-–]\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum).*$', '', 'i'))) AS style_key
    FROM public.live_products_apparel l
    WHERE coalesce(l.natural_fiber_percent, 0) >= 80
      AND public.catalog_offer_is_on_sale(l.is_sale, l.price::text, l.original_price::text)
      AND (
        p_fiber IS NULL OR btrim(p_fiber) IN ('', 'all')
        OR public.catalog_fiber_filter_pass(
          p_fiber,
          (SELECT c.material_primary FROM public.product_offer_classification c WHERE c.offer_id = l.id LIMIT 1),
          l.category,
          l.name,
          l.composition
        )
      )
      AND (
        p_max_price IS NULL
        OR coalesce(nullif(regexp_replace(coalesce(l.price::text, ''), '[^0-9.]', '', 'g'), '')::numeric, 999999) <= p_max_price
      )
  )
  SELECT count(*)::bigint
  FROM (
    SELECT DISTINCT b, style_key FROM scoped
  ) x;
$$;

GRANT SELECT ON public.collection_product_memberships TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collection_catalog_list(text, int, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collection_catalog_count(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sale_catalog_list(text, text, text, numeric, int, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sale_catalog_count(text, numeric) TO anon, authenticated, service_role;

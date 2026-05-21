-- =============================================================================
-- Catalog classification layer (additive — apply after 20240020)
-- - Does NOT delete products rows
-- - Does NOT change approved, composition, tags, collection_slugs
-- - Derived tables + functions only; backfill via manual batch SQL
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Classification functions (derived from source fields only)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalog_image_url_norm(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(trim(split_part(split_part(coalesce(p_url, ''), '?', 1), '#', 1)));
$$;

CREATE OR REPLACE FUNCTION public.catalog_style_key(
  p_image_url text,
  p_brand_slug text,
  p_name text,
  p_composition text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT encode(
    digest(
      concat_ws('|',
        public.catalog_image_url_norm(p_image_url),
        lower(trim(coalesce(p_brand_slug, ''))),
        lower(trim(coalesce(public.homepage_style_base_name(p_name), ''))),
        lower(trim(regexp_replace(coalesce(p_composition, ''), '\s+', ' ', 'g')))
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.catalog_classify_material(
  p_composition text,
  p_material_metadata jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  comp text := lower(trim(coalesce(p_composition, '')));
  meta text := lower(coalesce(p_material_metadata::text, ''));
  blob text := comp || ' ' || meta;
BEGIN
  IF comp = '' AND (p_material_metadata IS NULL OR p_material_metadata = '{}'::jsonb) THEN
    RETURN 'unknown_material';
  END IF;
  IF blob ~ '(silk|mulberry)' THEN RETURN 'silk'; END IF;
  IF blob ~ '(cashmere)' THEN RETURN 'cashmere'; END IF;
  IF blob ~ '(wool|merino|lambswool|alpaca)' THEN RETURN 'wool'; END IF;
  IF blob ~ '(linen|flax)' THEN RETURN 'linen'; END IF;
  IF blob ~ '(cotton)' THEN RETURN 'cotton'; END IF;
  IF blob ~ '(leather|suede)' THEN RETURN 'leather_suede'; END IF;
  IF blob ~ '(viscose|rayon|cupro|modal|lyocell|tencel)' THEN RETURN 'viscose_rayon'; END IF;
  IF blob ~ '(polyester|nylon|acrylic|elastane|spandex|polyamide)' THEN RETURN 'synthetic_blend'; END IF;
  RETURN 'unknown_material';
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_classify_garment(p_category text, p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cat text := lower(trim(coalesce(p_category, '')));
  nam text := lower(trim(coalesce(p_name, '')));
BEGIN
  IF cat = '' AND nam = '' THEN RETURN 'needs_review'; END IF;
  IF cat ~ '(dress|gown)' OR nam ~ '(dress|gown)' THEN RETURN 'dresses'; END IF;
  IF cat ~ '(blouse|bodysuit|tank|camisole)' OR nam ~ '(blouse|bodysuit)' THEN RETURN 'tops_blouses'; END IF;
  IF cat ~ '(^|[^a-z])top([^a-z]|$)' OR nam ~ '( tank top| camisole)' THEN RETURN 'tops_blouses'; END IF;
  IF cat ~ '(shirt)' AND cat !~ 't-shirt' THEN RETURN 'shirts'; END IF;
  IF cat ~ '(knit)' AND cat !~ '(sweater|cardigan)' THEN RETURN 'knitwear'; END IF;
  IF cat ~ '(sweater|cardigan|pullover|jumper)' THEN RETURN 'sweaters_cardigans'; END IF;
  IF cat ~ '(pant|trouser|jean|denim)' THEN RETURN 'pants_trousers'; END IF;
  IF cat ~ '(skirt)' THEN RETURN 'skirts'; END IF;
  IF cat ~ '(short)' THEN RETURN 'shorts'; END IF;
  IF cat ~ '(blazer|jacket)' THEN RETURN 'jackets_blazers'; END IF;
  IF cat ~ '(coat|outerwear|parka|trench|anorak)' THEN RETURN 'coats'; END IF;
  IF cat ~ '(swim|bikini|resort)' THEN RETURN 'swim_resortwear'; END IF;
  IF cat ~ '(scarf|wrap|shawl)' OR nam ~ '(scarf|wrap|shawl)' THEN RETURN 'scarves_wraps'; END IF;
  IF cat ~ '(set|co-ord|coord|two piece|two-piece)' THEN RETURN 'matching_sets'; END IF;
  IF cat = '' THEN RETURN 'needs_review'; END IF;
  RETURN 'other_apparel';
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_offer_completeness_status(
  p_category text,
  p_name text,
  p_composition text,
  p_image_url text,
  p_price text,
  p_url text,
  p_currency text
)
RETURNS text
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  excl text;
  mat text;
  garment text;
BEGIN
  excl := public.catalog_consumer_exclusion_reason(
    p_category, p_name, p_composition, p_image_url, p_price, p_url
  );
  IF excl IS NOT NULL THEN
    RETURN 'excluded';
  END IF;
  IF p_currency IS NULL OR trim(coalesce(p_currency, '')) = '' THEN
    RETURN 'needs_review';
  END IF;
  mat := public.catalog_classify_material(p_composition, NULL);
  IF mat = 'unknown_material' THEN
    RETURN 'needs_review';
  END IF;
  garment := public.catalog_classify_garment(p_category, p_name);
  IF garment = 'needs_review' THEN
    RETURN 'needs_review';
  END IF;
  RETURN 'complete';
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_offer_needs_review_reason(
  p_category text,
  p_name text,
  p_composition text,
  p_image_url text,
  p_price text,
  p_url text,
  p_currency text
)
RETURNS text
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  st text := public.catalog_offer_completeness_status(
    p_category, p_name, p_composition, p_image_url, p_price, p_url, p_currency
  );
BEGIN
  IF st = 'complete' THEN RETURN NULL; END IF;
  IF st = 'excluded' THEN
    RETURN public.catalog_consumer_exclusion_reason(
      p_category, p_name, p_composition, p_image_url, p_price, p_url
    );
  END IF;
  IF p_currency IS NULL OR trim(coalesce(p_currency, '')) = '' THEN RETURN 'missing_currency'; END IF;
  IF public.catalog_classify_material(p_composition, NULL) = 'unknown_material' THEN RETURN 'unknown_material'; END IF;
  IF public.catalog_classify_garment(p_category, p_name) = 'needs_review' THEN RETURN 'unknown_garment'; END IF;
  RETURN 'incomplete';
END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_infer_rail_keys(
  p_material_primary text,
  p_collection_slugs text[],
  p_is_sale boolean,
  p_brand_slug text,
  p_created_at timestamptz
)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  keys text[] := '{}'::text[];
  new_in_brands text[] := ARRAY[
    'frame','vince','theory','toteme','ganni','staud','khaite','isabel-marant',
    'rag-and-bone','citizens-of-humanity','reformation','nili-lotan'
  ]::text[];
  slugs text[] := coalesce(p_collection_slugs, '{}'::text[]);
BEGIN
  CASE p_material_primary
    WHEN 'silk' THEN keys := keys || 'fabrics:silk';
    WHEN 'linen' THEN keys := keys || 'fabrics:linen';
    WHEN 'cashmere' THEN keys := keys || 'fabrics:cashmere';
    WHEN 'wool' THEN keys := keys || 'fabrics:wool';
    WHEN 'cotton' THEN keys := keys || 'fabrics:cotton';
    WHEN 'leather_suede' THEN keys := keys || 'fabrics:leather-suede';
    ELSE NULL;
  END CASE;
  IF slugs && ARRAY['vacation-shop','vacation-edit']::text[] THEN keys := keys || 'collections:vacation'; END IF;
  IF slugs && ARRAY['evening-edit','evening']::text[] THEN keys := keys || 'collections:evening'; END IF;
  IF slugs && ARRAY['tailoring-edit','tailoring']::text[] THEN keys := keys || 'collections:tailoring'; END IF;
  IF slugs && ARRAY['white-edit','the-white-edit']::text[] THEN keys := keys || 'collections:white-edit'; END IF;
  IF slugs && ARRAY['city-wardrobe','summer-in-the-city']::text[] THEN keys := keys || 'collections:summer-in-the-city'; END IF;
  IF p_is_sale IS TRUE THEN keys := keys || 'sale:all'; END IF;
  IF p_brand_slug = ANY (new_in_brands) AND p_created_at >= (now() - interval '90 days') THEN
    keys := keys || 'top:new_in';
  END IF;
  RETURN keys;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Canonical + derived tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.canonical_products (
  canonical_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_key               text NOT NULL UNIQUE,
  brand_slug              text NOT NULL,
  style_name              text NOT NULL,
  image_url_norm          text,
  composition_norm        text,
  material_primary        text,
  garment_type            text,
  primary_fibers          text[] NOT NULL DEFAULT '{}',
  natural_fiber_percent   smallint,
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canonical_products_brand_slug_idx
  ON public.canonical_products (brand_slug);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS canonical_id uuid REFERENCES public.canonical_products (canonical_id);

CREATE INDEX IF NOT EXISTS products_canonical_id_idx ON public.products (canonical_id);
CREATE INDEX IF NOT EXISTS products_canonical_region_idx ON public.products (canonical_id, region);

CREATE TABLE IF NOT EXISTS public.product_offer_classification (
  offer_id                uuid PRIMARY KEY REFERENCES public.products (id) ON DELETE CASCADE,
  canonical_id            uuid REFERENCES public.canonical_products (canonical_id),
  material_primary        text NOT NULL,
  material_tags           text[] NOT NULL DEFAULT '{}',
  garment_type            text NOT NULL,
  completeness_status     text NOT NULL DEFAULT 'needs_review',
  needs_review_reason     text,
  inferred_rail_keys      text[] NOT NULL DEFAULT '{}',
  classifier_version      text NOT NULL DEFAULT 'v1',
  classified_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_offer_classification_canonical_idx
  ON public.product_offer_classification (canonical_id);

CREATE INDEX IF NOT EXISTS product_offer_classification_material_idx
  ON public.product_offer_classification (material_primary);

CREATE INDEX IF NOT EXISTS product_offer_classification_garment_idx
  ON public.product_offer_classification (garment_type);

CREATE INDEX IF NOT EXISTS product_offer_classification_complete_idx
  ON public.product_offer_classification (completeness_status)
  WHERE completeness_status = 'complete';

CREATE TABLE IF NOT EXISTS public.product_material_facts (
  canonical_id          uuid PRIMARY KEY REFERENCES public.canonical_products (canonical_id) ON DELETE CASCADE,
  material_primary      text NOT NULL,
  fiber_tags            text[] NOT NULL DEFAULT '{}',
  is_leather_suede      boolean NOT NULL DEFAULT false,
  parsed_from           text NOT NULL DEFAULT 'composition',
  material_confidence   smallint NOT NULL DEFAULT 70,
  parsed_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_garment_facts (
  canonical_id          uuid PRIMARY KEY REFERENCES public.canonical_products (canonical_id) ON DELETE CASCADE,
  garment_type          text NOT NULL,
  parsed_from           text NOT NULL DEFAULT 'category',
  garment_confidence    smallint NOT NULL DEFAULT 70,
  parsed_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_rail_membership (
  canonical_id    uuid NOT NULL REFERENCES public.canonical_products (canonical_id) ON DELETE CASCADE,
  rail_key        text NOT NULL,
  source          text NOT NULL,
  priority        smallint NOT NULL DEFAULT 100,
  active          boolean NOT NULL DEFAULT true,
  conflict_note   text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (canonical_id, rail_key, source)
);

CREATE INDEX IF NOT EXISTS product_rail_membership_rail_active_idx
  ON public.product_rail_membership (rail_key, active)
  WHERE active IS TRUE;

COMMENT ON TABLE public.product_offer_classification IS
  'Per regional offer (products.id). Derived only — never overwrites source composition/tags.';

COMMENT ON TABLE public.canonical_products IS
  'One garment/style. Multiple regional offers link via products.canonical_id.';

-- -----------------------------------------------------------------------------
-- 3) Read views
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.live_products_classified AS
SELECT
  l.*,
  c.material_primary,
  c.garment_type,
  c.completeness_status,
  c.needs_review_reason,
  c.inferred_rail_keys,
  c.canonical_id AS classification_canonical_id,
  c.classified_at
FROM public.live_products_apparel l
LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id;

COMMENT ON VIEW public.live_products_classified IS
  'Live apparel + derived classification (nullable until backfill).';

CREATE OR REPLACE VIEW public.consumer_catalog_cards AS
WITH base AS (
  SELECT
    l.*,
    p.canonical_id,
    coalesce(
      p.canonical_id::text,
      public.catalog_dedupe_key(l.image_url, l.brand_name, l.name, l.composition, l.product_id, l.id)
    ) AS card_key,
    coalesce(c.completeness_status, public.catalog_offer_completeness_status(
      l.category, l.name, l.composition, l.image_url, l.price, l.url, l.currency
    )) AS completeness_status,
    coalesce(c.material_primary, public.catalog_classify_material(l.composition, l.material_metadata)) AS material_primary,
    coalesce(c.garment_type, public.catalog_classify_garment(l.category, l.name)) AS garment_type
  FROM public.live_products_apparel l
  JOIN public.products p ON p.id = l.id
  LEFT JOIN public.product_offer_classification c ON c.offer_id = l.id
),
ranked AS (
  SELECT
    b.*,
    row_number() OVER (
      PARTITION BY b.card_key
      ORDER BY public.catalog_region_rank(b.region), b.natural_fiber_percent DESC NULLS LAST, b.created_at DESC
    ) AS card_rank
  FROM base b
  WHERE b.completeness_status = 'complete'
)
SELECT * FROM ranked WHERE card_rank = 1;

COMMENT ON VIEW public.consumer_catalog_cards IS
  'One visible card per canonical style (or dedupe_key fallback). Best regional offer wins.';

CREATE OR REPLACE VIEW public.catalog_classification_summary AS
SELECT
  (SELECT COUNT(*)::bigint FROM public.live_products_apparel) AS live_apparel_offers,
  (SELECT COUNT(*)::bigint FROM public.product_offer_classification) AS classified_offers,
  (SELECT COUNT(*)::bigint FROM public.product_offer_classification WHERE completeness_status = 'complete') AS complete_offers,
  (SELECT COUNT(*)::bigint FROM public.product_offer_classification WHERE completeness_status = 'needs_review') AS needs_review_offers,
  (SELECT COUNT(*)::bigint FROM public.canonical_products) AS canonical_products,
  (SELECT COUNT(*)::bigint FROM public.product_rail_membership WHERE active IS TRUE) AS active_rail_memberships,
  (SELECT COUNT(*)::bigint FROM public.consumer_catalog_cards) AS visible_catalog_cards;

GRANT SELECT ON public.live_products_classified TO anon, authenticated, service_role;
GRANT SELECT ON public.consumer_catalog_cards TO anon, authenticated, service_role;
GRANT SELECT ON public.catalog_classification_summary TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- ROLLBACK (manual, after approval)
-- -----------------------------------------------------------------------------
-- DROP VIEW IF EXISTS public.catalog_classification_summary;
-- DROP VIEW IF EXISTS public.consumer_catalog_cards;
-- DROP VIEW IF EXISTS public.live_products_classified;
-- DROP TABLE IF EXISTS public.product_rail_membership;
-- DROP TABLE IF EXISTS public.product_garment_facts;
-- DROP TABLE IF EXISTS public.product_material_facts;
-- DROP TABLE IF EXISTS public.product_offer_classification;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS canonical_id;
-- DROP TABLE IF EXISTS public.canonical_products;
-- DROP FUNCTION IF EXISTS public.catalog_infer_rail_keys(text, text[], boolean, text, timestamptz);
-- DROP FUNCTION IF EXISTS public.catalog_offer_needs_review_reason(text, text, text, text, text, text, text);
-- DROP FUNCTION IF EXISTS public.catalog_offer_completeness_status(text, text, text, text, text, text, text);
-- DROP FUNCTION IF EXISTS public.catalog_classify_garment(text, text);
-- DROP FUNCTION IF EXISTS public.catalog_classify_material(text, jsonb);
-- DROP FUNCTION IF EXISTS public.catalog_style_key(text, text, text, text);
-- DROP FUNCTION IF EXISTS public.catalog_image_url_norm(text);

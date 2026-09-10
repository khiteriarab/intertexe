-- Replace Summer in the City with The Fall Edit (September 2026).
-- After apply: SELECT public.refresh_homepage_feeds_v2('us');

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Merch rail registry — new PK, retire old rail_key
-- -----------------------------------------------------------------------------
INSERT INTO public.homepage_merch_rails (
  rail_key,
  axis,
  slug,
  display_label,
  canonical_collection_slug,
  max_items,
  max_per_brand,
  refresh_strategy,
  enabled,
  sort_order,
  notes
)
SELECT
  'collections:fall-edit',
  axis,
  'fall-edit',
  'The Fall Edit',
  'fall-edit',
  max_items,
  max_per_brand,
  refresh_strategy,
  enabled,
  sort_order,
  coalesce(notes, '') || ' Renamed from summer-in-the-city Sep 2026'
FROM public.homepage_merch_rails
WHERE rail_key = 'collections:summer-in-the-city'
ON CONFLICT (rail_key) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  slug = EXCLUDED.slug,
  canonical_collection_slug = EXCLUDED.canonical_collection_slug,
  enabled = EXCLUDED.enabled,
  notes = EXCLUDED.notes;

DELETE FROM public.homepage_merch_rails
WHERE rail_key = 'collections:summer-in-the-city';

-- -----------------------------------------------------------------------------
-- 2) Feed cache rows
-- -----------------------------------------------------------------------------
UPDATE public.homepage_feed_items
SET rail_key = 'collections:fall-edit'
WHERE rail_key = 'collections:summer-in-the-city';

UPDATE public.homepage_feed_meta
SET rail_key = 'collections:fall-edit'
WHERE rail_key = 'collections:summer-in-the-city';

-- -----------------------------------------------------------------------------
-- 3) Product collection slugs
-- -----------------------------------------------------------------------------
UPDATE public.products
SET collection_slugs = (
  SELECT coalesce(array_agg(DISTINCT mapped), '{}'::text[])
  FROM (
    SELECT CASE
      WHEN s IN ('summer-in-the-city', 'city-wardrobe') THEN 'fall-edit'
      ELSE s
    END AS mapped
    FROM unnest(collection_slugs) AS s
  ) x
)
WHERE collection_slugs && ARRAY['summer-in-the-city', 'city-wardrobe']::text[];

DO $$
BEGIN
  IF to_regclass('public.collection_product_memberships') IS NOT NULL THEN
    UPDATE public.collection_product_memberships
    SET collection_slug = 'fall-edit'
    WHERE collection_slug = 'summer-in-the-city';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Resolver helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editorial_collection_membership_slug(p_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE public.editorial_resolve_collection_slug(p_slug)
    WHEN 'vacation-shop' THEN 'vacation'
    WHEN 'tailoring-edit' THEN 'tailoring'
    WHEN 'city-wardrobe' THEN 'fall-edit'
    WHEN 'summer-in-the-city' THEN 'fall-edit'
    WHEN 'white-edit' THEN 'white-edit'
    WHEN 'silk-occasion' THEN 'evening'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.catalog_infer_rail_keys(
  p_material_primary text,
  p_collection_slugs text[],
  p_is_sale boolean,
  p_brand_slug text,
  p_created_at timestamptz,
  p_needs_material_review boolean DEFAULT false
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
  IF NOT coalesce(p_needs_material_review, false) THEN
    CASE p_material_primary
      WHEN 'silk' THEN keys := keys || 'fabrics:silk';
      WHEN 'linen' THEN keys := keys || 'fabrics:linen';
      WHEN 'cashmere' THEN keys := keys || 'fabrics:cashmere';
      WHEN 'wool' THEN keys := keys || 'fabrics:wool';
      WHEN 'cotton' THEN keys := keys || 'fabrics:cotton';
      WHEN 'leather_suede' THEN keys := keys || 'fabrics:leather-suede';
      ELSE NULL;
    END CASE;
  END IF;
  IF slugs && ARRAY['vacation-shop','vacation-edit']::text[] THEN keys := keys || 'collections:vacation'; END IF;
  IF slugs && ARRAY['evening-edit','evening']::text[] THEN keys := keys || 'collections:evening'; END IF;
  IF slugs && ARRAY['tailoring-edit','tailoring']::text[] THEN keys := keys || 'collections:tailoring'; END IF;
  IF slugs && ARRAY['white-edit','the-white-edit']::text[] THEN keys := keys || 'collections:white-edit'; END IF;
  IF slugs && ARRAY['city-wardrobe','summer-in-the-city','fall-edit']::text[] THEN keys := keys || 'collections:fall-edit'; END IF;
  IF p_is_sale IS TRUE THEN keys := keys || 'sale:all'; END IF;
  IF p_brand_slug = ANY (new_in_brands) AND p_created_at >= (now() - interval '90 days') THEN
    keys := keys || 'top:new_in';
  END IF;
  RETURN keys;
END;
$$;

COMMIT;

-- Sale catalog: count and list every on-sale offer (no brand/style DISTINCT dedupe).
-- Previously sale_catalog_* deduped by (brand_slug, style_key) → ~47 US rows vs ~3000+ offers.

DROP FUNCTION IF EXISTS public.sale_catalog_count(text, numeric);

CREATE OR REPLACE FUNCTION public.sale_catalog_count(
  p_fiber text DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_region text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
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
    AND (
      p_region IS NULL OR btrim(p_region) = ''
      OR lower(coalesce(l.region, '')) = lower(btrim(p_region))
    );
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
  SELECT l.*
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
    AND lower(coalesce(l.region, '')) IN (
      lower(coalesce(nullif(trim(p_preferred_region), ''), 'us')),
      lower(coalesce(nullif(trim(p_fallback_region), ''), 'us'))
    )
  ORDER BY
    public.catalog_region_rank(l.region, coalesce(nullif(trim(p_preferred_region), ''), 'us')),
    l.natural_fiber_percent DESC NULLS LAST,
    l.created_at DESC NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 48), 500))
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.sale_catalog_count(text, numeric, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sale_catalog_list(text, text, text, numeric, int, int) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

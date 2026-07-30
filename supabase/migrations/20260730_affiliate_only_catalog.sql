-- Consumer catalog policy: only commission-tracked affiliate offers may be live.
-- Direct brand-store rows remain in products for research, but are unavailable
-- to web/iOS catalog and favorite hydration until an affiliate offer is attached.

CREATE OR REPLACE FUNCTION public.catalog_is_affiliate_offer(
  p_retailer_mid text,
  p_feed_source text,
  p_url text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    nullif(trim(coalesce(p_retailer_mid, '')), '') IS NOT NULL
    OR lower(trim(coalesce(p_feed_source, ''))) IN (
      'rakuten',
      'rakuten_footwear',
      'mytheresa',
      'awin'
    )
    OR lower(coalesce(p_url, '')) LIKE '%click.linksynergy.com/%'
    OR lower(coalesce(p_url, '')) LIKE '%awin1.com/%'
    OR lower(coalesce(p_url, '')) LIKE '%go.redirectingat.com/%';
$$;

CREATE OR REPLACE FUNCTION public.enforce_affiliate_only_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.catalog_is_affiliate_offer(
    NEW.retailer_mid,
    NEW.feed_source,
    NEW.url
  ) THEN
    NEW.approved := 'no';
    NEW.is_active := false;
    NEW.is_displayable := false;
    NEW.stock_status := 'unavailable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_require_affiliate ON public.products;
CREATE TRIGGER trg_products_require_affiliate
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_affiliate_only_product();

-- Soft-hide existing direct inventory; never delete rows or favorites.
UPDATE public.products
SET approved = 'no',
    is_active = false,
    is_displayable = false,
    stock_status = 'unavailable',
    updated_at = now()
WHERE NOT public.catalog_is_affiliate_offer(retailer_mid, feed_source, url)
  AND (
    approved IS DISTINCT FROM 'no'
    OR is_active IS DISTINCT FROM false
    OR is_displayable IS DISTINCT FROM false
    OR stock_status IS DISTINCT FROM 'unavailable'
  );

NOTIFY pgrst, 'reload schema';

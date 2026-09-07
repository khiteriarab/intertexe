-- Allow Bloomingdale's marketplace rows tagged feed_source = 'bloomingdales'.
-- Covers US Rakuten MID 13867 and UK MID 37206.

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
      'bloomingdales',
      'awin'
    )
    OR lower(coalesce(p_url, '')) LIKE '%click.linksynergy.com/%'
    OR lower(coalesce(p_url, '')) LIKE '%awin1.com/%'
    OR lower(coalesce(p_url, '')) LIKE '%go.redirectingat.com/%';
$$;

NOTIFY pgrst, 'reload schema';

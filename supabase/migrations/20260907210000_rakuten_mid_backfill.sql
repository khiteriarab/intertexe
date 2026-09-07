-- Backfill Rakuten merchant metadata and reactivate qualifying MyTheresa EU footwear.
-- Safe to run multiple times.

-- Retag MID 43654 from legacy MyTheresa mis-label to Tory Burch UK.
UPDATE public.products
SET
  feed_source = 'rakuten',
  brand_name = 'Tory Burch',
  brand_slug = 'tory-burch',
  retailer = 'Tory Burch',
  region = 'uk',
  currency = coalesce(nullif(currency, ''), 'GBP'),
  retailer_country = 'GB',
  updated_at = now()
WHERE retailer_mid = '43654'
  AND feed_source = 'mytheresa';

-- Bloomingdale's marketplace rows
UPDATE public.products
SET feed_source = 'bloomingdales', updated_at = now()
WHERE retailer_mid IN ('13867', '37206')
  AND coalesce(feed_source, 'rakuten') = 'rakuten';

-- MyTheresa rows missing retailer_mid (legacy pipe ingest)
UPDATE public.products p
SET retailer_mid = CASE
      WHEN p.product_id LIKE 'mytheresa-us-ca%' OR p.region = 'us' THEN '43172'
      WHEN p.product_id LIKE 'mytheresa-uk%' OR p.region = 'uk' THEN '43654'
      ELSE '35663'
    END,
    updated_at = now()
WHERE p.feed_source = 'mytheresa'
  AND p.retailer_mid IS NULL;

-- EU/UK/ME leather footwear left inactive (category often "Apparel & Accessories" from XML)
UPDATE public.products
SET
  is_active = true,
  approved = 'yes',
  category = 'Footwear',
  garment_type = 'shoes',
  natural_fiber_percent = 100,
  updated_at = now(),
  last_seen_at = now()
WHERE retailer_mid = '35663'
  AND feed_source = 'mytheresa'
  AND is_active = false
  AND name ~* '(sandal|boot|mule|loafer|heel|sneaker|espadrille|ballerin|flat|pump|clog|trainer|loafers|sandals|boots|mules|heels)'
  AND composition ~* 'leather'
  AND name !~* '(\\mkid\\mkids\\mchild\\mchildren\\minfant\\mbaby\\mboy\\mgirl\\mjunior\\myouth)';

NOTIFY pgrst, 'reload schema';

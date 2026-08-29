-- Apparel missing count + top garment_types
WITH us_apparel AS (
  SELECT l.id, l.garment_type, l.category, l.name
  FROM live_products_apparel l
  WHERE lower(coalesce(l.region, '')) = 'us'
),
assigned AS (
  SELECT DISTINCT pta.offer_id
  FROM product_taxonomy_assignments pta
  WHERE pta.taxonomy_version = 'retail-v1'
    AND pta.taxonomy_slug LIKE 'clothing/%'
    AND pta.taxonomy_slug <> 'clothing/all'
),
missing AS (
  SELECT a.*
  FROM us_apparel a
  LEFT JOIN assigned s ON s.offer_id = a.id
  WHERE s.offer_id IS NULL
)
SELECT 'apparel_missing' AS metric, count(*)::text AS value FROM missing
UNION ALL
SELECT 'apparel_live', count(*)::text FROM us_apparel
UNION ALL
SELECT 'apparel_assigned', count(*)::text FROM us_apparel a JOIN assigned s ON s.offer_id = a.id;

SELECT garment_type, count(*) AS n
FROM (
  SELECT a.garment_type
  FROM live_products_apparel a
  WHERE lower(coalesce(a.region, '')) = 'us'
    AND NOT EXISTS (
      SELECT 1 FROM product_taxonomy_assignments pta
      WHERE pta.offer_id = a.id AND pta.taxonomy_version = 'retail-v1'
        AND pta.taxonomy_slug LIKE 'clothing/%' AND pta.taxonomy_slug <> 'clothing/all'
    )
) sub
GROUP BY 1 ORDER BY n DESC LIMIT 15;

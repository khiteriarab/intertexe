ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_displayable boolean;

CREATE OR REPLACE FUNCTION update_is_displayable()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_displayable = (
    NEW.approved = 'yes'
    AND NEW.is_active = true
    AND COALESCE(NEW.natural_fiber_percent, 0) >= 80
    AND NEW.image_url IS NOT NULL
    AND (NEW.gender_scope IS NULL OR NEW.gender_scope NOT IN ('men','male','mens','boys'))
    AND NEW.name NOT ILIKE '%lubricant%'
    AND NEW.name NOT ILIKE '%lube%'
    AND NEW.name NOT ILIKE '%supplement%'
    AND NEW.name NOT ILIKE '%vitamin%'
    AND NEW.name NOT ILIKE '%fragrance%'
    AND NEW.name NOT ILIKE '%perfume%'
    AND NEW.name NOT ILIKE '%skincare%'
    AND NEW.name NOT ILIKE '%serum%'
    AND NEW.category NOT ILIKE '%beauty%'
    AND NEW.category NOT ILIKE '%health%'
    AND NEW.category NOT ILIKE '%wellness%'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_is_displayable ON products;
CREATE TRIGGER trg_update_is_displayable
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_is_displayable();

-- Backfill in batches to avoid statement timeouts on large tables.
WITH candidates AS (
  SELECT ctid
  FROM products
  WHERE region = 'us' AND is_displayable IS NULL
  ORDER BY created_at DESC
  LIMIT 10000
),
upd AS (
  UPDATE products p
  SET is_displayable = (
    p.approved = 'yes'
    AND p.is_active = true
    AND p.natural_fiber_percent >= 80
    AND p.image_url IS NOT NULL
    AND (p.gender_scope IS NULL OR p.gender_scope NOT IN ('men','male','mens','boys'))
    AND p.name NOT ILIKE '%lubricant%'
    AND p.name NOT ILIKE '%lube%'
    AND p.name NOT ILIKE '%supplement%'
    AND p.name NOT ILIKE '%vitamin%'
    AND p.name NOT ILIKE '%fragrance%'
    AND p.name NOT ILIKE '%perfume%'
    AND p.name NOT ILIKE '%skincare%'
    AND p.name NOT ILIKE '%serum%'
    AND p.category NOT ILIKE '%beauty%'
    AND p.category NOT ILIKE '%health%'
    AND p.category NOT ILIKE '%wellness%'
  )
  FROM candidates c
  WHERE p.ctid = c.ctid
  RETURNING 1
)
SELECT count(*)::int AS backfilled_rows
FROM upd;

CREATE INDEX IF NOT EXISTS idx_products_displayable_region
ON products(region, created_at DESC)
WHERE is_displayable = true;

CREATE OR REPLACE VIEW live_products_apparel AS
SELECT *
FROM products
WHERE is_displayable = true;

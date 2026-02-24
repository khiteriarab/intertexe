-- Run this in Supabase SQL Editor to add matching set support
-- Adds matching_set_id column and updates the Sandro rhinestone set

ALTER TABLE products ADD COLUMN IF NOT EXISTS matching_set_id TEXT;

-- Link the Sandro Rhinestone matching set
UPDATE products SET matching_set_id = 'sandro-rhinestone-set' WHERE product_id = 'sandro-rhinestone-cropped-shirt-g023';
UPDATE products SET matching_set_id = 'sandro-rhinestone-set' WHERE product_id = 'sandro-maxi-ruffled-rhinestone-skirt-g023';

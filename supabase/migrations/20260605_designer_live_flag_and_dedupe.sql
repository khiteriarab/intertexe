-- Designer live flag + dedupe duplicate slugs (preserve master list rows).

ALTER TABLE public.designers
  ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Remove duplicate slugs, keeping the row with the most complete data.
DELETE FROM public.designers d
WHERE d.id NOT IN (
  SELECT DISTINCT ON (slug) id
  FROM public.designers
  ORDER BY slug,
    (CASE WHEN hero_image IS NOT NULL AND trim(hero_image) <> '' THEN 1 ELSE 0 END) DESC,
    (CASE WHEN status IS NOT NULL AND trim(status) <> '' THEN 1 ELSE 0 END) DESC,
    (CASE WHEN name IS NOT NULL AND trim(name) <> '' THEN 1 ELSE 0 END) DESC,
    id ASC
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'designers_slug_unique'
  ) THEN
    ALTER TABLE public.designers ADD CONSTRAINT designers_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Mark brands as live when they have 2+ US live catalog products.
UPDATE public.designers d
SET
  is_live = true,
  product_count = counts.cnt,
  last_synced_at = NOW()
FROM (
  SELECT brand_slug AS slug, COUNT(*)::integer AS cnt
  FROM public.live_products_apparel
  WHERE region = 'us'
    AND brand_slug IS NOT NULL
    AND trim(brand_slug) <> ''
  GROUP BY brand_slug
  HAVING COUNT(*) >= 2
) counts
WHERE d.slug = counts.slug;

UPDATE public.designers d
SET
  is_live = false,
  product_count = 0,
  last_synced_at = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.live_products_apparel l
  WHERE l.brand_slug = d.slug
    AND l.region = 'us'
  GROUP BY l.brand_slug
  HAVING COUNT(*) >= 2
);

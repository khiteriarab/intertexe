-- Run this single command in Supabase SQL Editor to generate website URLs for all designers
-- It uses the brand name to create a URL (e.g., "Gucci" -> "https://gucci.com")

UPDATE designers
SET website = 'https://' || 
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(trim(name)),
          '[®™*#°]', '', 'g'
        ),
        '\s+', '', 'g'
      ),
      '[&+]', '', 'g'
    ),
    '[^a-z0-9.-]', '', 'g'
  ) || '.com'
WHERE website IS NULL
  AND length(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(trim(name)),
          '[®™*#°]', '', 'g'
        ),
        '\s+', '', 'g'
      ),
      '[&+]', '', 'g'
    ),
    '[^a-z0-9.-]', '', 'g'
  )) >= 2;

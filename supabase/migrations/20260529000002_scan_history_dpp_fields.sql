-- Extend scan_history for full DPP + product context on every scan.

ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS product_url text,
  ADD COLUMN IF NOT EXISTS care_instructions text,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS has_recycled_content boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';

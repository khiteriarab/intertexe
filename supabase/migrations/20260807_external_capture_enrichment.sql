-- -----------------------------------------------------------------------------
-- External capture enrichment columns (Find Better)
-- Safe to re-run: ADD COLUMN IF NOT EXISTS
-- Never touches products / live_products.
-- -----------------------------------------------------------------------------

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS subcategory text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS pattern text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS silhouette text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS fit text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS length text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS distinctive_details jsonb;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS attributes jsonb;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS match_brief jsonb;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS provenance jsonb;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_status text DEFAULT 'pending';

COMMENT ON COLUMN public.external_captures.enrichment_status IS
  'pending | running | ready | failed | skipped — URL metadata enrichment only; never writes products';

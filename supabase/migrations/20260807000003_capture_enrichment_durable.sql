-- -----------------------------------------------------------------------------
-- Durable external capture enrichment state machine
-- Never touches products / live_products.
-- -----------------------------------------------------------------------------

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_attempt_count integer DEFAULT 0;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_locked_at timestamptz;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_next_retry_at timestamptz;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_ai_used boolean DEFAULT false;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_ai_model text;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_ai_at timestamptz;

ALTER TABLE public.external_captures
  ADD COLUMN IF NOT EXISTS enrichment_ai_tokens integer;

COMMENT ON COLUMN public.external_captures.enrichment_status IS
  'pending | enriching | ready | enrichment_retry | needs_information | failed | skipped — durable URL enrichment; never writes products. Alias: running = enriching';

COMMENT ON COLUMN public.external_captures.enrichment_attempt_count IS
  'Number of enrichment attempts (deterministic + optional OpenAI fallback)';

COMMENT ON COLUMN public.external_captures.enrichment_locked_at IS
  'Lease timestamp to prevent duplicate concurrent enrichment workers';

-- -----------------------------------------------------------------------------
-- External Capture System (Save to INTERTEXE)
-- Copy of ios-repo migration for website deploy pipelines.
-- External items never overwrite verified products / live_products.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.external_captures (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               text NOT NULL,
  item_type             text NOT NULL DEFAULT 'captured_url'
                        CHECK (item_type IN (
                          'catalog_product',
                          'external_product',
                          'captured_url',
                          'captured_image'
                        )),
  source_app            text NOT NULL DEFAULT 'ios_app'
                        CHECK (source_app IN (
                          'ios_app',
                          'ios_share_extension',
                          'chrome_extension',
                          'safari_extension',
                          'web',
                          'api'
                        )),
  original_url          text,
  canonical_url         text,
  url_hash              text,
  image_url             text,
  image_storage_path    text,
  image_hash            text,
  title                 text,
  retailer              text,
  brand_name            text,
  price                 numeric,
  currency              text,
  description           text,
  composition_text      text,
  sku                   text,
  external_product_id   text,
  resolution_status     text NOT NULL DEFAULT 'saved'
                        CHECK (resolution_status IN (
                          'saved',
                          'queued',
                          'resolving',
                          'analyzed',
                          'alternatives_ready',
                          'failed'
                        )),
  material_status       text NOT NULL DEFAULT 'unknown'
                        CHECK (material_status IN (
                          'verified',
                          'source_page',
                          'ai_estimated',
                          'unknown'
                        )),
  material_confidence   text,
  natural_fiber_percent numeric,
  fiber_breakdown       jsonb,
  error_message         text,
  matched_product_id    text,
  matched_at            timestamptz,
  alternatives          jsonb,
  alternatives_ready_at timestamptz,
  decode_requested      boolean NOT NULL DEFAULT false,
  decode_requested_at   timestamptz,
  decoded_at            timestamptz,
  collection_id         uuid REFERENCES public.user_collections(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_captures_user_created
  ON public.external_captures (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_captures_user_status
  ON public.external_captures (user_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_external_captures_url_hash
  ON public.external_captures (user_id, url_hash)
  WHERE url_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_captures_image_hash
  ON public.external_captures (user_id, image_hash)
  WHERE image_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_captures_matched
  ON public.external_captures (matched_product_id)
  WHERE matched_product_id IS NOT NULL;

ALTER TABLE public.external_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external_captures_select_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_insert_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_update_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_delete_own" ON public.external_captures;
DROP POLICY IF EXISTS "external_captures_service_role" ON public.external_captures;

CREATE POLICY "external_captures_select_own"
  ON public.external_captures FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
CREATE POLICY "external_captures_insert_own"
  ON public.external_captures FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "external_captures_update_own"
  ON public.external_captures FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "external_captures_delete_own"
  ON public.external_captures FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);
CREATE POLICY "external_captures_service_role"
  ON public.external_captures FOR ALL TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE public.user_collection_items
  ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'catalog_product'
    CHECK (item_kind IN ('catalog_product', 'external_capture'));
ALTER TABLE public.user_collection_items
  ADD COLUMN IF NOT EXISTS capture_id uuid REFERENCES public.external_captures(id) ON DELETE CASCADE;
ALTER TABLE public.user_collection_items
  ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.user_collection_items
  DROP CONSTRAINT IF EXISTS user_collection_items_collection_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_catalog_product
  ON public.user_collection_items (collection_id, product_id)
  WHERE item_kind = 'catalog_product' AND product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_capture
  ON public.user_collection_items (collection_id, capture_id)
  WHERE item_kind = 'external_capture' AND capture_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_collection_items_capture
  ON public.user_collection_items (capture_id)
  WHERE capture_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.capture_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text,
  capture_id    uuid REFERENCES public.external_captures(id) ON DELETE SET NULL,
  event_type    text NOT NULL
                CHECK (event_type IN (
                  'capture_created',
                  'decode_started',
                  'decode_succeeded',
                  'decode_failed',
                  'resolution_matched',
                  'alternatives_viewed',
                  'original_source_clicked',
                  'alternative_clicked',
                  'saved_to_collection',
                  'favorited'
                )),
  source_app    text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_events_capture
  ON public.capture_events (capture_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_events_user
  ON public.capture_events (user_id, created_at DESC);

ALTER TABLE public.capture_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capture_events_select_own" ON public.capture_events;
DROP POLICY IF EXISTS "capture_events_insert_own" ON public.capture_events;
DROP POLICY IF EXISTS "capture_events_service_role" ON public.capture_events;
CREATE POLICY "capture_events_select_own"
  ON public.capture_events FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
CREATE POLICY "capture_events_insert_own"
  ON public.capture_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "capture_events_service_role"
  ON public.capture_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_external_captures_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_external_captures_updated_at ON public.external_captures;
CREATE TRIGGER trg_external_captures_updated_at
  BEFORE UPDATE ON public.external_captures
  FOR EACH ROW EXECUTE FUNCTION public.set_external_captures_updated_at();

-- Private capture images (service role upload; signed URLs for clients)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'external-captures',
  'external-captures',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

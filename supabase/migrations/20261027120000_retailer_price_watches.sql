-- True PDP price watches on an external retailer URL (TX Match / extension Alert me).
-- Distinct from account-level catalog sale_alerts and catalog product price_watches.

CREATE TABLE IF NOT EXISTS public.retailer_price_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_url text NOT NULL,
  url_hash text NOT NULL,
  title text,
  brand text,
  retailer text,
  currency text,
  original_price numeric,
  last_known_price numeric,
  capture_id uuid REFERENCES public.external_captures(id) ON DELETE SET NULL,
  source text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_retailer_price_watches_user_active
  ON public.retailer_price_watches (user_id, active)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_retailer_price_watches_url_hash
  ON public.retailer_price_watches (url_hash)
  WHERE active = true;

ALTER TABLE public.retailer_price_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retailer_price_watches_own ON public.retailer_price_watches;
CREATE POLICY retailer_price_watches_own
  ON public.retailer_price_watches FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.retailer_price_watches FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.retailer_price_watches TO authenticated;
GRANT ALL ON TABLE public.retailer_price_watches TO service_role;

COMMENT ON TABLE public.retailer_price_watches IS
  'Watch a specific retailer PDP URL for price drops (extension / TX Match).';

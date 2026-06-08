-- Server-side scan session store: merges barcode, composition, price across requests
CREATE TABLE IF NOT EXISTS public.scan_sessions (
  session_id text PRIMARY KEY,
  barcode text,
  brand_name text,
  brand_slug text,
  product_name text,
  garment_type text,
  detected_price numeric,
  detected_currency text DEFAULT 'USD',
  composition text,
  natural_percent integer,
  image_url text,
  region text DEFAULT 'us',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_updated
  ON public.scan_sessions(updated_at);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on scan_sessions" ON public.scan_sessions;
CREATE POLICY "Service role full access on scan_sessions"
  ON public.scan_sessions FOR ALL
  USING (auth.role() = 'service_role');

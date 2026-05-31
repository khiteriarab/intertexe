-- Scan feedback for debugging bad scanner results
CREATE TABLE IF NOT EXISTS public.scan_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_type text NOT NULL,
  raw_composition text,
  natural_fiber_percent integer,
  garment_type text,
  raw_ocr_text text,
  scan_source text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.scan_feedback;
CREATE POLICY "Anyone can insert feedback"
  ON public.scan_feedback FOR INSERT
  WITH CHECK (true);

-- GDPR consent tracking on user preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gdpr_consent_date timestamptz,
ADD COLUMN IF NOT EXISTS gdpr_consent_version text DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS fabric_persona text,
ADD COLUMN IF NOT EXISTS preferred_fiber text;

NOTIFY pgrst, 'reload schema';

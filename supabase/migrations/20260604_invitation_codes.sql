-- Per-user referral invitation codes
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id),
  used_by_user_id uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  code_type text DEFAULT 'referral'
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code
  ON public.invitation_codes(code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_invitation_codes_creator
  ON public.invitation_codes(created_by_user_id);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own codes" ON public.invitation_codes;
CREATE POLICY "Users can see their own codes"
  ON public.invitation_codes FOR SELECT
  USING (auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "Service role full access" ON public.invitation_codes;
CREATE POLICY "Service role full access"
  ON public.invitation_codes FOR ALL
  USING (auth.role() = 'service_role');

-- Seed reusable master codes (multi-use, never marked used)
INSERT INTO public.invitation_codes (code, code_type, is_active)
VALUES
  ('INTERTEXE2025', 'master', true),
  ('FIBER001', 'master', true),
  ('NATURAL2025', 'master', true),
  ('EDITORIALVIP', 'master', true),
  ('FOUNDING2025', 'master', true),
  ('KHITERI001', 'master', true)
ON CONFLICT (code) DO NOTHING;

NOTIFY pgrst, 'reload schema';

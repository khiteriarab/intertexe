-- One permanent reusable referral code per user
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS referral_code text,
ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_referral_code
  ON public.user_preferences(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code text NOT NULL,
  referrer_user_id uuid REFERENCES auth.users(id),
  referred_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own referrals" ON public.referrals;
CREATE POLICY "Users can see their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Service role full access on referrals" ON public.referrals;
CREATE POLICY "Service role full access on referrals"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';

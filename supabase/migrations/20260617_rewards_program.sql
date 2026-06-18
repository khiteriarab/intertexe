-- Intertexe Rewards: Fiber / Silk / Cashmere tiers
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS rewards_tier text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS total_scans integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_spend numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_founding_member boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rewards_joined_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.calculate_rewards_tier(
  p_total_scans integer,
  p_annual_spend numeric,
  p_is_founding_member boolean
) RETURNS text AS $$
BEGIN
  IF p_is_founding_member THEN RETURN 'fiber'; END IF;
  IF COALESCE(p_total_scans, 0) >= 200 OR COALESCE(p_annual_spend, 0) >= 5000 THEN RETURN 'cashmere'; END IF;
  IF COALESCE(p_total_scans, 0) >= 50 OR COALESCE(p_annual_spend, 0) >= 2000 THEN RETURN 'silk'; END IF;
  IF COALESCE(p_total_scans, 0) >= 10 OR COALESCE(p_annual_spend, 0) >= 500 THEN RETURN 'fiber'; END IF;
  RETURN 'none';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.update_rewards_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rewards_tier = public.calculate_rewards_tier(
    NEW.total_scans,
    NEW.annual_spend,
    COALESCE(NEW.is_founding_member, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rewards_tier_trigger ON public.user_preferences;
CREATE TRIGGER rewards_tier_trigger
BEFORE INSERT OR UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_rewards_tier();

CREATE OR REPLACE FUNCTION public.increment_scan_count(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, total_scans, updated_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
  SET total_scans = COALESCE(public.user_preferences.total_scans, 0) + 1,
      updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Pre-launch signups before Aug 8 2026 receive founding Fiber status
UPDATE public.user_preferences
SET is_founding_member = true
WHERE COALESCE(rewards_joined_at, updated_at, created_at, now()) < '2026-08-08'
  AND COALESCE(is_founding_member, false) = false;

NOTIFY pgrst, 'reload schema';

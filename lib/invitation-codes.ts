import { createServiceClient } from "@/lib/supabase/server";

const MASTER_CODES = new Set([
  "INTERTEXE2025",
  "FIBER001",
  "NATURAL2025",
  "EDITORIALVIP",
  "FOUNDING2025",
]);

const FIBERS = ["SILK", "LINEN", "WOOL", "COTTON", "CASHMERE", "ALPACA", "MERINO"];

function masterCodesFromEnv(): Set<string> {
  const fromEnv = (process.env.INVITE_CODES || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const codes = new Set(MASTER_CODES);
  fromEnv.forEach((c) => codes.add(c));
  return codes;
}

export type ReferralProfile = {
  referral_code: string | null;
  referral_count: number;
};

export async function generatePermanentReferralCode(userId: string): Promise<string> {
  if (!userId) return "";

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("user_preferences")
    .select("referral_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.referral_code) {
    return existing.referral_code;
  }

  let code = "";
  let attempts = 0;

  while (attempts < 10) {
    const fiber = FIBERS[Math.floor(Math.random() * FIBERS.length)];
    const number = Math.floor(1000 + Math.random() * 9000);
    code = `${fiber}${number}`;

    const { data: taken } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!taken) break;
    attempts++;
  }

  if (!code) {
    code = `FIBER${Math.floor(10000 + Math.random() * 89999)}`;
  }

  await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      referral_code: code,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return code;
}

export async function validateInvitationCode(code: string): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  if (!normalized) return false;

  if (masterCodesFromEnv().has(normalized)) {
    return true;
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("referral_code", normalized)
      .maybeSingle();

    return !!data;
  } catch (err) {
    console.error("validateInvitationCode error:", err);
    return masterCodesFromEnv().has(normalized);
  }
}

export async function recordReferral(
  referralCode: string,
  referredUserId: string
): Promise<void> {
  const normalized = referralCode.toUpperCase().trim();
  if (!normalized || !referredUserId) return;

  if (masterCodesFromEnv().has(normalized)) {
    return;
  }

  try {
    const supabase = createServiceClient();

    const { data: referrer } = await supabase
      .from("user_preferences")
      .select("user_id, referral_count")
      .eq("referral_code", normalized)
      .maybeSingle();

    if (!referrer?.user_id || referrer.user_id === referredUserId) {
      return;
    }

    await supabase.from("referrals").insert({
      referral_code: normalized,
      referrer_user_id: referrer.user_id,
      referred_user_id: referredUserId,
    });

    await supabase
      .from("user_preferences")
      .update({ referral_count: (referrer.referral_count || 0) + 1 })
      .eq("user_id", referrer.user_id);
  } catch (err) {
    console.error("recordReferral error:", err);
  }
}

export async function getReferralProfile(userId: string): Promise<ReferralProfile> {
  if (!userId) {
    return { referral_code: null, referral_count: 0 };
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_preferences")
      .select("referral_code, referral_count")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      referral_code: data?.referral_code ?? null,
      referral_count: data?.referral_count ?? 0,
    };
  } catch (err) {
    console.error("getReferralProfile error:", err);
    return { referral_code: null, referral_count: 0 };
  }
}

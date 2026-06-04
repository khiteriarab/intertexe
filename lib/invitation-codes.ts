import { createServiceClient } from "@/lib/supabase/server";

const MASTER_CODES = new Set([
  "INTERTEXE2025",
  "FIBER001",
  "NATURAL2025",
  "EDITORIALVIP",
  "FOUNDING2025",
  "KHITERI001",
]);

const ADJECTIVES = ["SILK", "LINEN", "WOOL", "COTTON", "CASHMERE", "FIBER", "NATURAL"];

function generateCode(prefix = ""): string {
  const numbers = Math.floor(1000 + Math.random() * 9000);
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return prefix ? `${prefix}-${adj}${numbers}` : `${adj}${numbers}`;
}

function masterCodesFromEnv(): Set<string> {
  const fromEnv = (process.env.INVITE_CODES || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const codes = new Set(MASTER_CODES);
  fromEnv.forEach((c) => codes.add(c));
  return codes;
}

export async function validateInvitationCode(code: string): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  if (!normalized) return false;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("invitation_codes")
      .select("id, used_by_user_id, expires_at, code_type, is_active")
      .eq("code", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return false;
      }
      if (data.code_type === "master") {
        return true;
      }
      return !data.used_by_user_id;
    }
  } catch (err) {
    console.error("validateInvitationCode DB error:", err);
  }

  return masterCodesFromEnv().has(normalized);
}

export async function redeemInvitationCode(code: string, userId: string): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  if (!normalized || !userId) return false;

  if (masterCodesFromEnv().has(normalized)) {
    return true;
  }

  try {
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("invitation_codes")
      .select("id, code_type, used_by_user_id")
      .eq("code", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (!existing) return false;
    if (existing.code_type === "master") return true;
    if (existing.used_by_user_id) return existing.used_by_user_id === userId;

    const { error } = await supabase
      .from("invitation_codes")
      .update({
        used_by_user_id: userId,
        used_at: new Date().toISOString(),
      })
      .eq("code", normalized)
      .is("used_by_user_id", null);

    return !error;
  } catch (err) {
    console.error("redeemInvitationCode error:", err);
    return false;
  }
}

export async function generateReferralCodes(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("invitation_codes")
      .select("code")
      .eq("created_by_user_id", userId)
      .eq("code_type", "referral")
      .order("created_at", { ascending: true });

    if (existing && existing.length >= 3) {
      return existing.map((row) => row.code);
    }

    const needed = 3 - (existing?.length ?? 0);
    const codes: string[] = [];

    for (let i = 0; i < needed; i++) {
      let code = generateCode();
      let attempts = 0;
      while (attempts < 8) {
        const { data: clash } = await supabase
          .from("invitation_codes")
          .select("id")
          .eq("code", code)
          .maybeSingle();
        if (!clash && !codes.includes(code)) break;
        code = generateCode();
        attempts++;
      }
      codes.push(code);
    }

    if (codes.length === 0) return existing?.map((row) => row.code) ?? [];

    const { error } = await supabase.from("invitation_codes").insert(
      codes.map((code) => ({
        code,
        created_by_user_id: userId,
        code_type: "referral",
        is_active: true,
      }))
    );

    if (error) {
      console.error("Failed to generate referral codes:", error);
      return existing?.map((row) => row.code) ?? [];
    }

    const { data: all } = await supabase
      .from("invitation_codes")
      .select("code")
      .eq("created_by_user_id", userId)
      .eq("code_type", "referral")
      .order("created_at", { ascending: true });

    return all?.map((row) => row.code) ?? codes;
  } catch (err) {
    console.error("generateReferralCodes error:", err);
    return [];
  }
}

export type ReferralCodeRow = {
  code: string;
  used_by_user_id: string | null;
  used_at: string | null;
  created_at: string | null;
};

export async function getUserReferralCodes(userId: string): Promise<ReferralCodeRow[]> {
  if (!userId) return [];

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("invitation_codes")
      .select("code, used_by_user_id, used_at, created_at")
      .eq("created_by_user_id", userId)
      .eq("code_type", "referral")
      .order("created_at", { ascending: true });

    return data ?? [];
  } catch (err) {
    console.error("getUserReferralCodes error:", err);
    return [];
  }
}

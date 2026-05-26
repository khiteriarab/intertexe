import type { SupabaseClient } from "@supabase/supabase-js";

export async function queueScanFollowUp(
  supabase: SupabaseClient,
  input: {
    email: string;
    composition: string;
    naturalFiberPercent: number;
    verdict: string;
    alternativesUrl?: string;
  }
): Promise<void> {
  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanEmail) return;

  const sendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("scan_follow_up_queue").insert({
    email: cleanEmail,
    composition: input.composition,
    natural_fiber_percent: Math.round(input.naturalFiberPercent),
    verdict: input.verdict,
    alternatives_url: input.alternativesUrl || "https://www.intertexe.com/scanner?ref=email",
    send_at: sendAt,
    sent: false,
  });

  if (error) {
    console.error("scan_follow_up_queue insert:", error.message);
  }
}

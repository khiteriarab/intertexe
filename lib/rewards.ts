import type { SupabaseClient } from "@supabase/supabase-js";

export async function incrementScanCount(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase.rpc("increment_scan_count", { p_user_id: userId });
    if (error) console.error("increment_scan_count:", error.message);
  } catch (err) {
    console.error("increment_scan_count:", err);
  }
}

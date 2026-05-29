import type { SupabaseClient } from "@supabase/supabase-js";

export type FunnelEventType =
  | "scan_started"
  | "barcode_detected"
  | "composition_detected"
  | "result_shown"
  | "alternative_clicked"
  | "scan_failed";

export type FunnelEventInput = {
  session_id: string;
  event_type: FunnelEventType;
  user_id?: string | null;
  device_type?: string | null;
  scan_source?: string | null;
  natural_fiber_percent?: number | null;
  has_result?: boolean;
  error?: string | null;
};

/** Persists scanner funnel steps (metadata stored in jsonb — table has no dedicated DPP columns). */
export async function recordFunnelEvent(
  supabase: SupabaseClient,
  event: FunnelEventInput
): Promise<void> {
  const sessionId = (event.session_id || "").trim();
  if (!sessionId) return;

  try {
    const { error } = await supabase.from("scanner_funnel_events").insert({
      event_type: event.event_type,
      session_id: sessionId,
      user_id: event.user_id ?? null,
      device_type: event.device_type ?? null,
      source_page: event.scan_source ?? null,
      metadata: {
        scan_source: event.scan_source ?? null,
        natural_fiber_percent: event.natural_fiber_percent ?? null,
        has_result: event.has_result ?? false,
        error: event.error ?? null,
      },
    });
    if (error) {
      console.error("[scanner_funnel_events] insert:", error.message);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[scanner_funnel_events] insert failed:", msg);
  }
}

export function resolveFunnelSessionId(sessionId?: string | null): string {
  const trimmed = (sessionId || "").trim();
  if (trimmed) return trimmed;
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

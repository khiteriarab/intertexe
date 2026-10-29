/**
 * Capture / Inspirations API DB access.
 *
 * Always use the service-role client scoped by the authenticated user id.
 * The Oct 2026 RLS lockdown revoked authenticated GRANTs on external_captures;
 * user-JWT clients then return permission denied and iOS shows load failures.
 */
import { getServerSupabase } from "./supabase-service-client";

export function getCaptureServiceClient() {
  return getServerSupabase();
}

export function captureApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message?: unknown }).message || "").trim();
    if (msg) return msg;
  }
  return fallback;
}

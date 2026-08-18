/**
 * Canonical signup-channel labels for attribution + Founder Welcome metadata.
 * Welcome itself is always sent server-side from POST /api/auth/signup
 * (Loops + email_deliveries claim). Clients must not send a second welcome.
 */
import type { FirstTouchAttribution } from "./dashboard/attribution";

export type SignupSource = "web_signup" | "chrome_extension" | "ios";
export type AcquisitionPlatform = "website" | "ios" | "chrome_extension";

export function parseSignupSource(raw: unknown): SignupSource {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "chrome_extension" || v === "extension" || v === "chrome") {
    return "chrome_extension";
  }
  if (v === "ios" || v === "ios_signup") return "ios";
  return "web_signup";
}

export function parseAcquisitionPlatform(raw: unknown): AcquisitionPlatform | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "chrome_extension") return "chrome_extension";
  if (v === "ios") return "ios";
  if (v === "website") return "website";
  return null;
}

export function acquisitionPlatformForSignup(source: SignupSource): AcquisitionPlatform {
  if (source === "chrome_extension") return "chrome_extension";
  if (source === "ios") return "ios";
  return "website";
}

/** email_deliveries.metadata.source for the Founder Welcome claim. */
export function welcomeSourceForSignup(source: SignupSource): string {
  if (source === "chrome_extension") return "chrome_extension";
  if (source === "ios") return "ios_signup";
  return "web_signup";
}

export function applySignupSourceToFirstTouch(
  ft: FirstTouchAttribution,
  source: SignupSource
): FirstTouchAttribution {
  const platform = acquisitionPlatformForSignup(source);
  const next: FirstTouchAttribution = {
    ...ft,
    acquisition_platform: platform,
    attribution_extra: {
      ...(ft.attribution_extra || {}),
      signup_source: source,
    },
  };
  if (source === "chrome_extension") {
    next.utm_source = ft.utm_source || "chrome_extension";
    next.utm_medium = ft.utm_medium || "extension";
  }
  return next;
}

/**
 * Supabase Auth returns the existing user with identities=[] when the email
 * is already registered (fake success). Do not create profile or send welcome.
 */
export function isDuplicateSupabaseSignUp(user: {
  identities?: unknown[] | null;
} | null | undefined): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

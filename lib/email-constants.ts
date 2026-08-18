/** Shared email identity constants.

 * Channel split:
 * - Resend (mail.intertexe.com): automated / system mail — lifecycle, weekly edit, price drops
 * - Loops (khiteri@intertexe.com): Founder Welcome only — From configured in Loops template UI
 */

/** Default From for Resend customer-facing emails (verified domain: mail.intertexe.com). */
export const EMAIL_FROM = "Intertexe <info@mail.intertexe.com>";

/** Default Reply-To for Resend customer emails. */
export const EMAIL_REPLY_TO = "info@intertexe.com";

/**
 * Founder Welcome From identity — configured in the Loops transactional template,
 * not sent via Resend. Documented here for dashboards / tests.
 */
export const EMAIL_FROM_FOUNDER = "Khiteri <khiteri@intertexe.com>";

/** Founder Welcome Reply-To — set in the Loops template to match From. */
export const EMAIL_REPLY_TO_FOUNDER = "khiteri@intertexe.com";

export const EMAIL_TYPES = {
  FOUNDER_WELCOME: "founder_welcome",
  SCAN_FOLLOWUP: "scan_followup",
  PRICE_DROP: "price_drop",
  WEEKLY_EDIT: "weekly_edit",
  WEEKLY_EDIT_PREVIEW: "weekly_edit_preview",
  LIFECYCLE_DAY4: "lifecycle_day4",
  LIFECYCLE_DAY10: "lifecycle_day10",
  LIFECYCLE_DAY25: "lifecycle_day25",
  PLATFORM_LEAD: "platform_lead",
} as const;

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES];

/** Behavior-router branches (stored in email_deliveries.metadata.branch). */
export const LIFECYCLE_BRANCHES = {
  DAY4_NO_SCAN: "day4_no_scan",
  DAY4_HAS_SCAN: "day4_has_scan",
  DAY10_FAVORITES: "day10_favorites",
  DAY10_TX_MATCH: "day10_tx_match",
  DAY10_INACTIVE: "day10_inactive",
  DAY25_ACTIVE_REVIEW: "day25_active_review",
  DAY25_INACTIVE_WINBACK: "day25_inactive_winback",
  DAY25_FEEDBACK: "day25_feedback",
} as const;

export type LifecycleBranch =
  (typeof LIFECYCLE_BRANCHES)[keyof typeof LIFECYCLE_BRANCHES];

export const LIFECYCLE_CHECKPOINTS = [4, 10, 25] as const;
export type LifecycleCheckpointDay = (typeof LIFECYCLE_CHECKPOINTS)[number];

export function lifecycleEmailTypeForDay(
  day: LifecycleCheckpointDay
): EmailType {
  if (day === 4) return EMAIL_TYPES.LIFECYCLE_DAY4;
  if (day === 10) return EMAIL_TYPES.LIFECYCLE_DAY10;
  return EMAIL_TYPES.LIFECYCLE_DAY25;
}

export const EMAIL_STATUSES = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  BOUNCED: "bounced",
  COMPLAINED: "complained",
  FAILED: "failed",
} as const;

export type EmailStatus = (typeof EMAIL_STATUSES)[keyof typeof EMAIL_STATUSES];

export function founderWelcomeSubject(firstName?: string | null): string {
  const name = (firstName || "").trim();
  return name ? `Welcome to INTERTEXE, ${name} 🤍` : "Welcome to INTERTEXE 🤍";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Resend helpers for INTERTEXE automated / system email.
 * Founder Welcome lives in lib/founder-welcome.ts (Loops only) — re-exported here
 * so existing imports keep working without a Resend send path.
 */
export {
  sendWelcomeEmail,
  resolveWelcomeCtaUrl,
  type SendWelcomeEmailInput,
  type SendWelcomeEmailResult,
} from "../lib/founder-welcome";

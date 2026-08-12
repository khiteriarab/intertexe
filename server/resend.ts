import { render } from "@react-email/render";
import WelcomeEmail from "../emails/WelcomeEmail";
import { getAppStoreUrl, isAppDeepLinkReady } from "../lib/app-store";
import {
  EMAIL_FROM_FOUNDER,
  EMAIL_REPLY_TO,
  EMAIL_TYPES,
  founderWelcomeSubject,
  normalizeEmail,
} from "../lib/email-constants";
import { claimFounderWelcomeSend } from "../lib/email-deliveries";
import { sendCustomerEmail } from "../lib/resend-customer";
import { createServiceClient } from "../lib/supabase/server";

export type SendWelcomeEmailInput = {
  email: string;
  firstName?: string | null;
  userId?: string | null;
  source?: string;
};

export type SendWelcomeEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  deliveryId?: string;
  providerMessageId?: string | null;
};

function resolveWelcomeCtaUrl(): string {
  // Deep links are intentionally gated off until production-ready (lib/app-store.ts).
  if (isAppDeepLinkReady()) {
    return getAppStoreUrl();
  }
  return getAppStoreUrl();
}

/**
 * Canonical founder welcome sender.
 * All production callers must use this function — it enforces durable idempotency
 * and delivery logging via email_deliveries.
 */
export async function sendWelcomeEmail(
  emailOrInput: string | SendWelcomeEmailInput,
  firstNameMaybe?: string
): Promise<SendWelcomeEmailResult> {
  const input: SendWelcomeEmailInput =
    typeof emailOrInput === "string"
      ? { email: emailOrInput, firstName: firstNameMaybe }
      : emailOrInput;

  const email = normalizeEmail(input.email || "");
  if (!email) {
    return { ok: false, reason: "missing_email" };
  }

  const firstName = (input.firstName || "").trim();
  const supabase = createServiceClient();

  const claim = await claimFounderWelcomeSend(supabase, {
    userId: input.userId,
    email,
    metadata: {
      source: input.source || "unknown",
      transactional: true,
      classification: "account_onboarding",
    },
  });

  if (claim.action === "skip") {
    return {
      ok: true,
      skipped: true,
      reason: claim.reason,
      deliveryId: claim.deliveryId,
    };
  }

  const html = await render(
    WelcomeEmail({
      firstName,
      ctaUrl: resolveWelcomeCtaUrl(),
    })
  );

  const result = await sendCustomerEmail({
    to: email,
    subject: founderWelcomeSubject(firstName),
    html,
    emailType: EMAIL_TYPES.FOUNDER_WELCOME,
    userId: input.userId,
    from: EMAIL_FROM_FOUNDER,
    replyTo: EMAIL_REPLY_TO,
    deliveryId: claim.deliveryId,
    metadata: {
      source: input.source || "unknown",
      transactional: true,
    },
  });

  return {
    ok: result.ok,
    deliveryId: result.deliveryId,
    providerMessageId: result.providerMessageId,
    reason: result.error,
  };
}

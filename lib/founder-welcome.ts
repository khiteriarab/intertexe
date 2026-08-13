/**
 * Canonical Founder Welcome sender — Loops only.
 *
 * Flow: claim email_deliveries (provider=loops) → Loops transactional → mark sent.
 * Never falls back to Resend (prevents dual Welcome).
 */
import { getAppStoreUrl, getUniversalOpenUrl, isAppDeepLinkReady } from "./app-store";
import {
  EMAIL_TYPES,
  founderWelcomeSubject,
  normalizeEmail,
} from "./email-constants";
import {
  claimFounderWelcomeSend,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
} from "./email-deliveries";
import {
  getFounderWelcomeTransactionalId,
  isLoopsFounderWelcomeEnabled,
  sendLoopsTransactionalEmail,
  syncContactToLoops,
} from "./loops";
import { createServiceClient } from "./supabase/server";

export type SendWelcomeEmailInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
  source?: string;
  invitationCode?: string;
};

export type SendWelcomeEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  deliveryId?: string;
  providerMessageId?: string | null;
  provider?: "loops";
};

export function resolveWelcomeCtaUrl(): string {
  if (isAppDeepLinkReady()) {
    // Post-registration: open the installed app. Do not send them back to Download.
    return getUniversalOpenUrl();
  }
  return getAppStoreUrl();
}

/**
 * Founder Welcome via Loops transactional email.
 * Requires:
 * - LOOPS_API_KEY
 * - LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID (published Loops template)
 * - LOOPS_FOUNDER_WELCOME_ENABLED=1 (explicit production enable)
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
  const transactionalId = getFounderWelcomeTransactionalId();
  const enabled = isLoopsFounderWelcomeEnabled();

  // Hard gate: never Resend. Until Loops is configured + ENABLED=1, skip without claiming
  // so we do not pollute the ledger or block a later successful send.
  if (!enabled) {
    return {
      ok: false,
      reason: "loops_welcome_disabled",
      provider: "loops",
    };
  }
  if (!transactionalId) {
    return {
      ok: false,
      reason: "loops_transactional_id_missing",
      provider: "loops",
    };
  }

  const claim = await claimFounderWelcomeSend(supabase, {
    userId: input.userId,
    email,
    provider: "loops",
    metadata: {
      source: input.source || "unknown",
      transactional: true,
      classification: "account_onboarding",
      lifecycle_stage: "day0_founder_welcome",
      provider: "loops",
      loops_transactional_id: transactionalId,
      from_identity: "Khiteri <khiteri@intertexe.com>",
    },
  });

  if (claim.action === "skip") {
    return {
      ok: true,
      skipped: true,
      reason: claim.reason,
      deliveryId: claim.deliveryId,
      provider: "loops",
    };
  }

  // Ensure contact exists / attributes updated before transactional send.
  await syncContactToLoops({
    email,
    firstName: firstName || undefined,
    lastName: input.lastName || undefined,
    source: input.source || "founder_welcome",
    invitationCode: input.invitationCode,
  }).catch(() => null);

  const ctaUrl = resolveWelcomeCtaUrl();
  const result = await sendLoopsTransactionalEmail({
    transactionalId,
    email,
    addToAudience: true,
    idempotencyKey: claim.deliveryId,
    dataVariables: {
      firstName: firstName || "",
      ctaUrl,
      subject: founderWelcomeSubject(firstName),
    },
  });

  if (!result.ok) {
    await markEmailDeliveryFailed(supabase, claim.deliveryId, result.error);
    return {
      ok: false,
      reason: result.error,
      deliveryId: claim.deliveryId,
      provider: "loops",
    };
  }

  await markEmailDeliverySent(supabase, claim.deliveryId, result.providerMessageId, {
    provider: "loops",
  });

  return {
    ok: true,
    deliveryId: claim.deliveryId,
    providerMessageId: result.providerMessageId,
    provider: "loops",
  };
}

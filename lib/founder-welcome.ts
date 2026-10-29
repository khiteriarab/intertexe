/**
 * Canonical Founder Welcome sender — Loops only.
 *
 * Flow: claim email_deliveries (provider=loops) → Loops transactional → mark sent.
 * Never falls back to Resend (prevents dual Welcome).
 */
import { APP_UNIVERSAL_ORIGIN, APP_DOWNLOAD_PATH, getAppStoreUrl } from "./app-store";
import { getChromeWebStoreUrl } from "./chrome-extension";
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

const WELCOME_UTM = {
  utm_source: "loops",
  utm_medium: "email",
  utm_campaign: "founder_welcome",
} as const;

function withWelcomeUtm(baseUrl: string, cta: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", WELCOME_UTM.utm_source);
  url.searchParams.set("utm_medium", WELCOME_UTM.utm_medium);
  url.searchParams.set("utm_campaign", WELCOME_UTM.utm_campaign);
  url.searchParams.set("itx_cta", cta.slice(0, 80));
  return url.toString();
}

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

/**
 * Primary CTA for Loops templates that still bind a single `ctaUrl`.
 * Most welcome recipients have not installed yet — send them to download, not /open.
 */
export function resolveWelcomeCtaUrl(): string {
  return resolveWelcomeAppDownloadUrl();
}

/** First-party /download hop → App Store (logs app_download_click). */
export function resolveWelcomeAppDownloadUrl(): string {
  return withWelcomeUtm(
    `${APP_UNIVERSAL_ORIGIN}${APP_DOWNLOAD_PATH}`,
    "email_founder_welcome_app"
  );
}

/** Chrome Web Store listing for the Fabric Scanner extension. */
export function resolveWelcomeChromeExtensionUrl(): string {
  return withWelcomeUtm(getChromeWebStoreUrl(), "email_founder_welcome_chrome");
}

/** Direct App Store URL (no /download hop) — available as a Loops dataVariable. */
export function resolveWelcomeAppStoreUrl(): string {
  return withWelcomeUtm(getAppStoreUrl(), "email_founder_welcome_appstore");
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

  const appDownloadUrl = resolveWelcomeAppDownloadUrl();
  const chromeExtensionUrl = resolveWelcomeChromeExtensionUrl();
  const appStoreUrl = resolveWelcomeAppStoreUrl();
  // Primary ctaUrl stays the app download link for existing Loops templates.
  const ctaUrl = appDownloadUrl;
  const subject = founderWelcomeSubject(firstName);
  // Loops templates are case-sensitive. This published template requires
  // lowercase `firstname`; also send camelCase so either UI convention works.
  const result = await sendLoopsTransactionalEmail({
    transactionalId,
    email,
    addToAudience: true,
    idempotencyKey: claim.deliveryId,
    dataVariables: {
      firstName: firstName || "",
      firstname: firstName || "",
      ctaUrl,
      ctaurl: ctaUrl,
      appDownloadUrl,
      appdownloadurl: appDownloadUrl,
      chromeExtensionUrl,
      chromeextensionurl: chromeExtensionUrl,
      appStoreUrl,
      appstoreurl: appStoreUrl,
      subject,
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

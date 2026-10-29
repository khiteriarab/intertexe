/**
 * PostHog client helpers for the INTERTEXE consumer site.
 * Consent-gated via the same cookie_consent key as Meta Pixel.
 * Keys come from env — never hardcode project tokens in source.
 */

import posthog from "posthog-js";
import {
  hasMarketingConsent,
  META_PIXEL_CONSENT_EVENT,
} from "./meta-pixel";

export const POSTHOG_CONSENT_EVENT = META_PIXEL_CONSENT_EVENT;

let initialized = false;

export function getPostHogKey(): string | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return key || null;
}

export function getPostHogHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    "https://us.i.posthog.com"
  );
}

export function isPostHogReplayEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_POSTHOG_REPLAY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  // Default on when PostHog is configured (privacy masks applied at init).
  return true;
}

export function isPostHogConfigured(): boolean {
  return Boolean(getPostHogKey());
}

export function initPostHog(): boolean {
  if (typeof window === "undefined") return false;
  const key = getPostHogKey();
  if (!key) return false;
  if (!hasMarketingConsent()) return false;
  if (initialized) return true;

  const replay = isPostHogReplayEnabled();
  posthog.init(key, {
    api_host: getPostHogHost(),
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // SPA handler owns pageviews
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    disable_session_recording: !replay,
    ...(replay
      ? {
          session_recording: {
            maskAllInputs: true,
            maskTextSelector:
              "[data-ph-mask], input[type='password'], input[type='email'], textarea",
            recordCrossOriginIframes: false,
          },
        }
      : {}),
  });

  initialized = true;
  return true;
}

export function shutdownPostHog() {
  if (typeof window === "undefined") return;
  try {
    posthog.opt_out_capturing();
  } catch {
    // ignore
  }
}

export function capturePostHogPageview(pathname: string | null) {
  if (typeof window === "undefined" || !pathname) return;
  if (!initPostHog()) return;
  posthog.capture("$pageview", {
    $current_url: window.location.href,
    path: pathname,
  });
}

export function identifyPostHogUser(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  const id = String(userId).trim();
  if (!id) return;
  if (!initPostHog()) return;
  // UUID only — never email/name.
  posthog.identify(id);
}

export function resetPostHogUser() {
  if (typeof window === "undefined") return;
  if (!initialized && !posthog.__loaded) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}

export function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (!initPostHog()) return;
  posthog.capture(event, properties);
}

export { posthog };

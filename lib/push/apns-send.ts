/**
 * APNs rich-push send helper (P1 foundation).
 *
 * Required env when PUSH_APNS_ENABLED=1:
 *   APNS_KEY_ID       — 10-char Key ID from Apple Developer
 *   APNS_TEAM_ID      — 10-char Team ID
 *   APNS_BUNDLE_ID    — e.g. com.stellarcommunications.intertexe
 *   APNS_KEY_P8       — contents of the .p8 auth key (preferred on Vercel)
 *   APNS_KEY_P8_PATH  — optional filesystem path to .p8 (local/dev)
 *   APNS_PRODUCTION   — "1" for production gateway, else sandbox
 *
 * Uses Apple's token-authenticated HTTP/2 API directly; no deprecated APNs
 * package or filesystem-backed key is required on Vercel.
 *
 * NOTE: Price-drop + sale alerts send email and rich APNs from
 * /api/notifications/price-drops (consolidated). This module is the shared
 * APNs transport; alert detection lives in the notification crons.
 */

import fs from "fs";
import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import { createServiceClient } from "@/lib/supabase/server";

export type RichPushPayloadInput = {
  title: string;
  body: string;
  imageUrl?: string | null;
  deeplink?: string | null;
  notificationType?: string | null;
  notificationId?: string | null;
  productId?: string | null;
  sound?: string;
  badge?: number;
};

/** Flat custom keys + aps for mutable-content rich notifications. */
export type ApnsPayload = {
  aps: {
    alert: { title: string; body: string };
    sound: string;
    "mutable-content": 1;
    badge?: number;
  };
  image_url?: string;
  deeplink?: string;
  notification_type?: string;
  notification_id?: string;
  product_id?: string;
};

export type SendApnsResult = {
  ok: boolean;
  dryRun: boolean;
  status?: string;
  reason?: string;
  invalidToken?: boolean;
};

export type ApnsConfigurationStatus = {
  enabled: boolean;
  production: boolean;
  requiredPresent: boolean;
  keyValid: boolean;
  missing: string[];
};

export function isApnsSendEnabled(): boolean {
  return process.env.PUSH_APNS_ENABLED === "1";
}

export function buildRichPushPayload(input: RichPushPayloadInput): ApnsPayload {
  const payload: ApnsPayload = {
    aps: {
      alert: {
        title: input.title,
        body: input.body,
      },
      sound: input.sound || "default",
      "mutable-content": 1,
    },
  };
  if (typeof input.badge === "number") {
    payload.aps.badge = input.badge;
  }
  if (input.imageUrl) payload.image_url = input.imageUrl;
  if (input.deeplink) payload.deeplink = input.deeplink;
  if (input.notificationType) payload.notification_type = input.notificationType;
  if (input.notificationId) payload.notification_id = input.notificationId;
  if (input.productId) payload.product_id = input.productId;
  return payload;
}

function readApnsKey(): string | null {
  if (process.env.APNS_KEY_P8?.trim()) {
    return process.env.APNS_KEY_P8.replace(/\\n/g, "\n").trim();
  }
  const path = process.env.APNS_KEY_P8_PATH?.trim();
  if (!path) return null;
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function missingApnsEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.APNS_KEY_ID) missing.push("APNS_KEY_ID");
  if (!process.env.APNS_TEAM_ID) missing.push("APNS_TEAM_ID");
  if (!process.env.APNS_BUNDLE_ID) missing.push("APNS_BUNDLE_ID");
  if (!readApnsKey()) missing.push("APNS_KEY_P8 (or APNS_KEY_P8_PATH)");
  return missing;
}

/** Validate APNs configuration without returning or logging secret values. */
export function validateApnsConfiguration(): ApnsConfigurationStatus {
  const missing = missingApnsEnv();
  let keyValid = false;
  if (missing.length === 0) {
    try {
      createPrivateKey(readApnsKey()!);
      keyValid = true;
    } catch {
      keyValid = false;
    }
  }
  return {
    enabled: isApnsSendEnabled(),
    production: process.env.APNS_PRODUCTION === "1",
    requiredPresent: missing.length === 0,
    keyValid,
    missing,
  };
}

/**
 * Delete a stale device token row after APNs reports BadDeviceToken / Unregistered.
 * Only call when a real send was attempted (PUSH_APNS_ENABLED=1).
 */
export async function deleteInvalidPushToken(token: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("user_push_tokens").delete().eq("token", token);
  } catch (err) {
    console.error("[apns] failed to delete invalid token", err);
  }
}

type InvalidTokenHook = (token: string, reason: string) => void | Promise<void>;

let cachedJwt: { value: string; issuedAt: number } | null = null;

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function apnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.issuedAt < 50 * 60) return cachedJwt.value;

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID }));
  const claims = base64Url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: now }));
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(readApnsKey()!),
    dsaEncoding: "ieee-p1363",
  });
  const value = `${unsigned}.${base64Url(signature)}`;
  cachedJwt = { value, issuedAt: now };
  return value;
}

/**
 * Send (or dry-run) one rich APNs notification.
 * Dry-run unless PUSH_APNS_ENABLED=1.
 */
export async function sendApnsNotification(
  deviceToken: string,
  payload: ApnsPayload,
  options?: { onInvalidToken?: InvalidTokenHook }
): Promise<SendApnsResult> {
  const dryRun = !isApnsSendEnabled();

  if (dryRun) {
    console.info("[apns] dry-run validated", {
      payloadType: payload.notification_type || "unspecified",
      hasImage: Boolean(payload.image_url),
      hasDeeplink: Boolean(payload.deeplink),
    });
    return { ok: true, dryRun: true, status: "dry-run" };
  }

  const missing = missingApnsEnv();
  if (missing.length) {
    console.error("[apns] missing env", missing);
    return {
      ok: false,
      dryRun: false,
      reason: `Missing env: ${missing.join(", ")}`,
    };
  }

  try {
    const authority =
      process.env.APNS_PRODUCTION === "1"
        ? "https://api.push.apple.com"
        : "https://api.sandbox.push.apple.com";
    const client = connect(authority);
    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      let settled = false;
      const finishError = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      client.once("error", finishError);
      const request = client.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        authorization: `bearer ${apnsJwt()}`,
        "apns-topic": process.env.APNS_BUNDLE_ID!,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600),
        "content-type": "application/json",
      });
      let status = 0;
      let body = "";
      request.setEncoding("utf8");
      request.on("response", (headers) => {
        status = Number(headers[":status"] || 0);
      });
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({ status, body });
      });
      request.once("error", finishError);
      request.end(JSON.stringify(payload));
    }).finally(() => client.close());

    if (response.status !== 200) {
      let reason = `APNs HTTP ${response.status || "unknown"}`;
      try {
        const parsed = JSON.parse(response.body) as { reason?: string };
        if (parsed.reason) reason = parsed.reason;
      } catch {
        // Keep the status-only reason; never echo arbitrary APNs response bodies.
      }
      const invalid =
        reason === "BadDeviceToken" ||
        reason === "Unregistered" ||
        reason === "DeviceTokenNotForTopic";
      if (invalid && options?.onInvalidToken) {
        await options.onInvalidToken(deviceToken, reason);
      }
      return {
        ok: false,
        dryRun: false,
        reason,
        invalidToken: invalid,
      };
    }

    return { ok: true, dryRun: false, status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[apns] send error", message);
    return { ok: false, dryRun: false, reason: message };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRichPushPayload,
  deleteInvalidPushToken,
  sendApnsNotification,
} from "@/lib/push/apns-send";

export type AlertPushInput = {
  userId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  deeplink?: string;
  notificationType: string;
  notificationId: string;
  productId?: string;
};

export type AlertPushResult = {
  sent: boolean;
  dryRun: boolean;
  reason?: string;
};

export async function fetchUserPushToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("user_push_tokens")
    .select("token, platform")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.token) return null;
  if (data.platform && data.platform !== "ios") return null;
  return data.token;
}

export async function sendAlertPushToUser(
  supabase: SupabaseClient,
  input: AlertPushInput
): Promise<AlertPushResult> {
  const token = await fetchUserPushToken(supabase, input.userId);
  if (!token) return { sent: false, dryRun: false, reason: "no_token" };

  const payload = buildRichPushPayload({
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl,
    deeplink: input.deeplink || "product",
    notificationType: input.notificationType,
    notificationId: input.notificationId,
    productId: input.productId,
  });

  const result = await sendApnsNotification(token, payload, {
    onInvalidToken: async (invalidToken) => {
      await deleteInvalidPushToken(invalidToken);
    },
  });

  return {
    sent: result.ok,
    dryRun: result.dryRun,
    reason: result.reason,
  };
}

export function formatPriceDropPushBody(
  brandName: string | null | undefined,
  productName: string,
  dropPct: number,
  currentPrice: number,
  currency: string
): string {
  const brand = brandName?.trim();
  const label = brand ? `${brand} — ${productName}` : productName;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(currentPrice);
  return `${label} is now ${price} (${dropPct}% off)`;
}

export function formatSaleAlertPushBody(
  brandName: string | null | undefined,
  productName: string,
  salePrice: number,
  currency: string
): string {
  const brand = brandName?.trim();
  const label = brand ? `${brand} — ${productName}` : productName;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(salePrice);
  return `${label} on sale from ${price}`;
}

/**
 * Rich remote push dispatcher (manual / inventory).
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * Transactional alerts (price drops, sale starts) are sent from
 * `/api/notifications/price-drops` alongside email. Use this route only for
 * manual broadcasts or token inventory checks.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildRichPushPayload,
  deleteInvalidPushToken,
  isApnsSendEnabled,
  sendApnsNotification,
  type SendApnsResult,
} from "@/lib/push/apns-send";

type PushTokenRow = {
  user_id: string;
  token: string;
  platform: string | null;
};

type DispatchPayload = {
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  deeplink?: string | null;
  notification_type?: string | null;
  notification_id?: string | null;
  product_id?: string | null;
  user_id?: string | null;
  limit?: number | null;
};

function pickPayload(req: NextRequest, body: DispatchPayload | null): DispatchPayload {
  const q = req.nextUrl.searchParams;
  return {
    title: body?.title ?? q.get("title"),
    body: body?.body ?? q.get("body"),
    image_url: body?.image_url ?? q.get("image_url"),
    deeplink: body?.deeplink ?? q.get("deeplink"),
    notification_type: body?.notification_type ?? q.get("notification_type"),
    notification_id: body?.notification_id ?? q.get("notification_id"),
    product_id: body?.product_id ?? q.get("product_id"),
    user_id: body?.user_id ?? q.get("user_id"),
    limit: body?.limit ?? (q.get("limit") ? Number(q.get("limit")) : null),
  };
}

async function runDispatch(req: NextRequest, body: DispatchPayload | null) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const dryRun = !isApnsSendEnabled();
  const input = pickPayload(req, body);
  const supabase = createServiceClient();

  let query = supabase
    .from("user_push_tokens")
    .select("user_id, token, platform")
    .not("token", "is", null);

  if (input.user_id) {
    query = query.eq("user_id", input.user_id);
  }

  const limit = Math.min(Math.max(Number(input.limit) || 200, 1), 500);
  const { data: rows, error } = await query.limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const tokens = ((rows || []) as PushTokenRow[]).filter(
    (r) => r.token && (!r.platform || r.platform === "ios")
  );

  // Inventory-only when no alert content — safe for scheduled cron ticks.
  if (!input.title?.trim() || !input.body?.trim()) {
    return NextResponse.json({
      ok: true,
      dryRun,
      mode: "inventory",
      tokenCount: tokens.length,
      message:
        "No title/body supplied — tokens inventoried only. Pass title & body (query or JSON) to dispatch. Price-drop email crons remain separate until push consolidates with price-check.",
      pushApnsEnabled: isApnsSendEnabled(),
    });
  }

  const payload = buildRichPushPayload({
    title: input.title.trim(),
    body: input.body.trim(),
    imageUrl: input.image_url,
    deeplink: input.deeplink || "product",
    notificationType: input.notification_type || "manual",
    notificationId: input.notification_id || `dispatch-${Date.now()}`,
    productId: input.product_id,
  });

  const results: SendApnsResult[] = [];
  let sent = 0;
  let failed = 0;
  let invalidRemoved = 0;

  for (const row of tokens) {
    const result = await sendApnsNotification(row.token, payload, {
      onInvalidToken: async (token, reason) => {
        await deleteInvalidPushToken(token);
        invalidRemoved++;
        console.warn("[push-dispatch] removed invalid token", { reason, userId: row.user_id });
      },
    });
    results.push(result);
    if (result.ok) sent++;
    else failed++;
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    mode: "dispatch",
    tokenCount: tokens.length,
    sent,
    failed,
    invalidRemoved,
    pushApnsEnabled: isApnsSendEnabled(),
    // Truncate result list for response size; full detail is in logs.
    sample: results.slice(0, 5),
  });
}

export async function GET(req: NextRequest) {
  return runDispatch(req, null);
}

export async function POST(req: NextRequest) {
  let body: DispatchPayload | null = null;
  try {
    body = (await req.json()) as DispatchPayload;
  } catch {
    body = null;
  }
  return runDispatch(req, body);
}

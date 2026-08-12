export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { EMAIL_STATUSES } from "@/lib/email-constants";
import {
  suppressMarketingForEmail,
  updateEmailDeliveryByProviderMessageId,
} from "@/lib/email-deliveries";
import { unsubscribeContactFromLoops } from "@/lib/loops";
import { createServiceClient } from "@/lib/supabase/server";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { message?: string };
    failed?: { reason?: string };
  };
};

function extractRecipient(data: ResendWebhookEvent["data"]): string | null {
  const to = data?.to;
  if (typeof to === "string" && to.trim()) return to.trim().toLowerCase();
  if (Array.isArray(to) && to[0]) return String(to[0]).trim().toLowerCase();
  return null;
}

/**
 * Resend delivery webhooks (Svix-signed).
 *
 * Manual setup required in Resend dashboard:
 * 1. Create webhook → URL https://www.intertexe.com/api/webhooks/resend
 * 2. Subscribe: email.delivered, email.bounced, email.complained, email.failed
 * 3. Copy signing secret (whsec_…) into Vercel env RESEND_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  let event: ResendWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const type = String(event.type || "");
  const emailId = event.data?.email_id;
  const recipient = extractRecipient(event.data);
  const stamp = event.created_at || new Date().toISOString();

  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: "missing_email_id" });
  }

  const supabase = createServiceClient();

  try {
    if (type === "email.delivered") {
      await updateEmailDeliveryByProviderMessageId(supabase, emailId, {
        status: EMAIL_STATUSES.DELIVERED,
        deliveredAt: stamp,
        metadata: { webhook_event: type },
      });
    } else if (type === "email.bounced") {
      const row = await updateEmailDeliveryByProviderMessageId(supabase, emailId, {
        status: EMAIL_STATUSES.BOUNCED,
        bouncedAt: stamp,
        failureReason: event.data?.bounce?.message || "bounced",
        metadata: { webhook_event: type },
      });
      if (recipient) {
        await suppressMarketingForEmail(supabase, recipient, "bounce", row?.user_id);
        await unsubscribeContactFromLoops(recipient).catch(() => null);
      }
    } else if (type === "email.complained") {
      const row = await updateEmailDeliveryByProviderMessageId(supabase, emailId, {
        status: EMAIL_STATUSES.COMPLAINED,
        complainedAt: stamp,
        metadata: { webhook_event: type },
      });
      if (recipient) {
        await suppressMarketingForEmail(supabase, recipient, "complaint", row?.user_id);
        await unsubscribeContactFromLoops(recipient).catch(() => null);
      }
    } else if (type === "email.failed" || type === "email.delivery_delayed") {
      // Permanent failure only — do not suppress marketing on temporary delay.
      if (type === "email.failed") {
        await updateEmailDeliveryByProviderMessageId(supabase, emailId, {
          status: EMAIL_STATUSES.FAILED,
          failedAt: stamp,
          failureReason: event.data?.failed?.reason || "failed",
          metadata: { webhook_event: type },
        });
      }
    }
  } catch (err) {
    console.error("resend webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

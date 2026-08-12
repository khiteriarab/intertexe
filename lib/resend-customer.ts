import { Resend } from "resend";
import { EMAIL_FROM, EMAIL_REPLY_TO, type EmailType } from "./email-constants";
import {
  createEmailDelivery,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
} from "./email-deliveries";
import { createServiceClient } from "./supabase/server";

export type CustomerEmailSendInput = {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  userId?: string | null;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
  /** When set, update this existing pending delivery instead of inserting. */
  deliveryId?: string;
};

export type CustomerEmailSendResult = {
  ok: boolean;
  skipped?: boolean;
  deliveryId?: string;
  providerMessageId?: string | null;
  error?: string;
};

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Send a customer-facing Resend email and persist delivery state.
 * Does not send when RESEND_API_KEY is missing (records failure if deliveryId provided).
 */
export async function sendCustomerEmail(
  input: CustomerEmailSendInput
): Promise<CustomerEmailSendResult> {
  const supabase = createServiceClient();
  let deliveryId = input.deliveryId;

  if (!deliveryId) {
    deliveryId = await createEmailDelivery(supabase, {
      userId: input.userId,
      email: input.to,
      emailType: input.emailType,
      metadata: input.metadata,
    });
  }

  const resend = getResend();
  if (!resend) {
    await markEmailDeliveryFailed(supabase, deliveryId, "RESEND_API_KEY missing");
    return { ok: false, deliveryId, error: "RESEND_API_KEY missing" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: input.from || EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo || EMAIL_REPLY_TO,
    });

    if (error) {
      await markEmailDeliveryFailed(
        supabase,
        deliveryId,
        error.message || "Resend send error"
      );
      return { ok: false, deliveryId, error: error.message };
    }

    const providerMessageId = data?.id || null;
    await markEmailDeliverySent(supabase, deliveryId, providerMessageId);
    return { ok: true, deliveryId, providerMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await markEmailDeliveryFailed(supabase, deliveryId, message);
    return { ok: false, deliveryId, error: message };
  }
}

export async function sendCustomerEmailBatch(
  items: Array<{
    to: string;
    subject: string;
    html: string;
    emailType: EmailType;
    userId?: string | null;
    from?: string;
    replyTo?: string;
    metadata?: Record<string, unknown>;
  }>
): Promise<{ sent: number; failed: number }> {
  const resend = getResend();
  const supabase = createServiceClient();
  if (!resend || items.length === 0) return { sent: 0, failed: items.length };

  // Create pending rows first for auditability.
  const deliveryIds: string[] = [];
  for (const item of items) {
    const id = await createEmailDelivery(supabase, {
      userId: item.userId,
      email: item.to,
      emailType: item.emailType,
      metadata: item.metadata,
    });
    deliveryIds.push(id);
  }

  const { data, error } = await resend.batch.send(
    items.map((item) => ({
      from: item.from || EMAIL_FROM,
      to: item.to,
      subject: item.subject,
      html: item.html,
      replyTo: item.replyTo || EMAIL_REPLY_TO,
    }))
  );

  if (error) {
    for (const id of deliveryIds) {
      await markEmailDeliveryFailed(supabase, id, error.message || "batch send failed");
    }
    return { sent: 0, failed: items.length };
  }

  const results = Array.isArray(data) ? data : data?.data || [];
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < deliveryIds.length; i++) {
    const row = results[i] as { id?: string } | undefined;
    if (row?.id) {
      await markEmailDeliverySent(supabase, deliveryIds[i], row.id);
      sent++;
    } else {
      await markEmailDeliveryFailed(supabase, deliveryIds[i], "batch item missing id");
      failed++;
    }
  }
  return { sent, failed };
}

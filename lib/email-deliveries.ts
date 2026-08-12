import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMAIL_STATUSES,
  EMAIL_TYPES,
  normalizeEmail,
  type EmailStatus,
  type EmailType,
} from "./email-constants";

export type EmailDeliveryRow = {
  id: string;
  user_id: string | null;
  email: string;
  email_type: string;
  provider: string;
  provider_message_id: string | null;
  status: EmailStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ClaimResult =
  | { action: "send"; deliveryId: string }
  | { action: "skip"; reason: "already_claimed" | "already_sent"; deliveryId?: string };

const ACTIVE_STATUSES: EmailStatus[] = [
  EMAIL_STATUSES.PENDING,
  EMAIL_STATUSES.SENT,
  EMAIL_STATUSES.DELIVERED,
];

function nowIso() {
  return new Date().toISOString();
}

/** Find an existing founder-welcome row that blocks another send. */
export async function findBlockingFounderWelcome(
  supabase: SupabaseClient,
  opts: { userId?: string | null; email: string }
): Promise<EmailDeliveryRow | null> {
  const email = normalizeEmail(opts.email);
  if (opts.userId) {
    const { data } = await supabase
      .from("email_deliveries")
      .select("*")
      .eq("email_type", EMAIL_TYPES.FOUNDER_WELCOME)
      .eq("user_id", opts.userId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as EmailDeliveryRow;
  }

  const { data } = await supabase
    .from("email_deliveries")
    .select("*")
    .eq("email_type", EMAIL_TYPES.FOUNDER_WELCOME)
    .is("user_id", null)
    .ilike("email", email)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as EmailDeliveryRow) || null;
}

/**
 * Atomically claim one send for an email_type (idempotent pending/sent/delivered).
 * Failed rows may be retried by reclaiming.
 */
export async function claimTypedEmailSend(
  supabase: SupabaseClient,
  opts: {
    emailType: EmailType;
    userId?: string | null;
    email: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ClaimResult> {
  const email = normalizeEmail(opts.email);
  const userId = opts.userId || null;
  const emailType = opts.emailType;

  let blocking: EmailDeliveryRow | null = null;
  if (userId) {
    const { data } = await supabase
      .from("email_deliveries")
      .select("*")
      .eq("email_type", emailType)
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    blocking = (data as EmailDeliveryRow) || null;
  } else if (emailType === EMAIL_TYPES.FOUNDER_WELCOME) {
    blocking = await findBlockingFounderWelcome(supabase, { userId: null, email });
  }

  if (blocking) {
    if (
      blocking.status === EMAIL_STATUSES.SENT ||
      blocking.status === EMAIL_STATUSES.DELIVERED
    ) {
      return { action: "skip", reason: "already_sent", deliveryId: blocking.id };
    }
    return { action: "skip", reason: "already_claimed", deliveryId: blocking.id };
  }

  let failedQuery = supabase
    .from("email_deliveries")
    .select("*")
    .eq("email_type", emailType)
    .eq("status", EMAIL_STATUSES.FAILED)
    .order("created_at", { ascending: false })
    .limit(1);

  if (userId) {
    failedQuery = failedQuery.eq("user_id", userId);
  } else {
    failedQuery = failedQuery.is("user_id", null).ilike("email", email);
  }

  const { data: failed } = await failedQuery.maybeSingle();
  if (failed?.id) {
    const { data: updated, error: updateError } = await supabase
      .from("email_deliveries")
      .update({
        status: EMAIL_STATUSES.PENDING,
        email,
        user_id: userId,
        failure_reason: null,
        failed_at: null,
        provider_message_id: null,
        metadata: {
          ...((failed.metadata as Record<string, unknown>) || {}),
          ...(opts.metadata || {}),
          retried_at: nowIso(),
        },
        updated_at: nowIso(),
      })
      .eq("id", failed.id)
      .eq("status", EMAIL_STATUSES.FAILED)
      .select("id")
      .maybeSingle();

    if (!updateError && updated?.id) {
      return { action: "send", deliveryId: updated.id };
    }
  }

  const { data: inserted, error } = await supabase
    .from("email_deliveries")
    .insert({
      user_id: userId,
      email,
      email_type: emailType,
      provider: "resend",
      status: EMAIL_STATUSES.PENDING,
      metadata: opts.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { action: "skip", reason: "already_claimed" };
    }
    throw error;
  }

  return { action: "send", deliveryId: inserted.id };
}

/** Atomically claim the right to send a founder welcome. */
export async function claimFounderWelcomeSend(
  supabase: SupabaseClient,
  opts: {
    userId?: string | null;
    email: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ClaimResult> {
  return claimTypedEmailSend(supabase, {
    emailType: EMAIL_TYPES.FOUNDER_WELCOME,
    userId: opts.userId,
    email: opts.email,
    metadata: opts.metadata,
  });
}

export async function createEmailDelivery(
  supabase: SupabaseClient,
  opts: {
    userId?: string | null;
    email: string;
    emailType: EmailType;
    status?: EmailStatus;
    providerMessageId?: string | null;
    metadata?: Record<string, unknown>;
    scheduledAt?: string | null;
  }
): Promise<string> {
  const status = opts.status || EMAIL_STATUSES.PENDING;
  const { data, error } = await supabase
    .from("email_deliveries")
    .insert({
      user_id: opts.userId || null,
      email: normalizeEmail(opts.email),
      email_type: opts.emailType,
      provider: "resend",
      status,
      provider_message_id: opts.providerMessageId || null,
      sent_at: status === EMAIL_STATUSES.SENT ? nowIso() : null,
      scheduled_at: opts.scheduledAt || null,
      metadata: opts.metadata || {},
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function markEmailDeliverySent(
  supabase: SupabaseClient,
  deliveryId: string,
  providerMessageId?: string | null
): Promise<void> {
  await supabase
    .from("email_deliveries")
    .update({
      status: EMAIL_STATUSES.SENT,
      provider_message_id: providerMessageId || null,
      sent_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", deliveryId);
}

export async function markEmailDeliveryFailed(
  supabase: SupabaseClient,
  deliveryId: string,
  reason: string
): Promise<void> {
  await supabase
    .from("email_deliveries")
    .update({
      status: EMAIL_STATUSES.FAILED,
      failure_reason: reason.slice(0, 1000),
      failed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", deliveryId);
}

export async function updateEmailDeliveryByProviderMessageId(
  supabase: SupabaseClient,
  providerMessageId: string,
  patch: {
    status: EmailStatus;
    deliveredAt?: string | null;
    bouncedAt?: string | null;
    complainedAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<EmailDeliveryRow | null> {
  const { data: existing } = await supabase
    .from("email_deliveries")
    .select("*")
    .eq("provider_message_id", providerMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) return null;

  const { data, error } = await supabase
    .from("email_deliveries")
    .update({
      status: patch.status,
      delivered_at: patch.deliveredAt ?? existing.delivered_at,
      bounced_at: patch.bouncedAt ?? existing.bounced_at,
      complained_at: patch.complainedAt ?? existing.complained_at,
      failed_at: patch.failedAt ?? existing.failed_at,
      failure_reason: patch.failureReason ?? existing.failure_reason,
      metadata: {
        ...((existing.metadata as Record<string, unknown>) || {}),
        ...(patch.metadata || {}),
      },
      updated_at: nowIso(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as EmailDeliveryRow;
}

/** Suppress marketing for hard bounce / spam complaint. Does not touch transactional classification. */
export async function suppressMarketingForEmail(
  supabase: SupabaseClient,
  email: string,
  reason: "bounce" | "complaint",
  userId?: string | null
): Promise<void> {
  const normalized = normalizeEmail(email);
  const stamp = nowIso();
  const userIds = new Set<string>();
  if (userId) userIds.add(userId);

  if (!userIds.size) {
    const { data: deliveries } = await supabase
      .from("email_deliveries")
      .select("user_id")
      .ilike("email", normalized)
      .not("user_id", "is", null)
      .limit(20);
    for (const row of deliveries || []) {
      if (row.user_id) userIds.add(String(row.user_id));
    }
  }

  for (const uid of userIds) {
    await supabase.from("user_preferences").upsert(
      {
        user_id: uid,
        marketing_emails: false,
        unsubscribed_at: stamp,
      },
      { onConflict: "user_id" }
    );
  }

  void reason;
  void normalized;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "../supabase-service-client";
import { nextStatusForEvent, type HqOutreachStatus } from "../hq-contacts";

const FOLLOW_UP_DAYS = 4;

export type OutreachDailyProgress = {
  sent_today: number;
  target_today: number;
  remaining_today: number;
  customer: number;
  influencer: number;
  business: number;
  brand: number;
  replies_today: number;
  new_accounts_from_contacts_today: number;
  follow_ups_due: number;
  timezone: string;
  day_start: string;
  day_end: string;
  tableReady: boolean;
  gmailConnected: boolean;
};

export type OutreachFunnel = {
  imported: number;
  emailed: number;
  replied: number;
  accounts: number;
  scanned: number;
  retailer_clicked: number;
  customer_accounts: number;
  influencer_accounts: number;
  business_accounts: number;
  brand_accounts: number;
  contacted_became_users: number;
  contacted_to_account_rate: number | null;
  imported_to_account_rate: number | null;
  avg_days_contact_to_signup: number | null;
  tableReady: boolean;
};

const EMPTY_FUNNEL: OutreachFunnel = {
  imported: 0,
  emailed: 0,
  replied: 0,
  accounts: 0,
  scanned: 0,
  retailer_clicked: 0,
  customer_accounts: 0,
  influencer_accounts: 0,
  business_accounts: 0,
  brand_accounts: 0,
  contacted_became_users: 0,
  contacted_to_account_rate: null,
  imported_to_account_rate: null,
  avg_days_contact_to_signup: null,
  tableReady: false,
};

const EMPTY: OutreachDailyProgress = {
  sent_today: 0,
  target_today: 25,
  remaining_today: 25,
  customer: 0,
  influencer: 0,
  business: 0,
  brand: 0,
  replies_today: 0,
  new_accounts_from_contacts_today: 0,
  follow_ups_due: 0,
  timezone: "Europe/Paris",
  day_start: "",
  day_end: "",
  tableReady: false,
  gmailConnected: false,
};

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return (
    code === "PGRST205" ||
    /schema cache/i.test(message) ||
    /does not exist/i.test(message) ||
    /hq_contact/i.test(message)
  );
}

export async function fetchOutreachToday(workspaceId: string): Promise<OutreachDailyProgress> {
  const supabase = getServerSupabase();
  if (!supabase) return EMPTY;

  const [{ data, error }, gmail] = await Promise.all([
    supabase.rpc("hq_outreach_daily_progress", { p_workspace_id: workspaceId }),
    supabase
      .from("hq_oauth_connections")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("provider", "gmail")
      .maybeSingle(),
  ]);

  const gmailConnected = gmail.data?.status === "connected" || gmail.data?.status === "degraded";

  if (error || !data) {
    if (isMissingTable(error)) return { ...EMPTY, gmailConnected };
    return { ...EMPTY, tableReady: false, gmailConnected };
  }

  const row = (typeof data === "object" ? data : {}) as Record<string, unknown>;
  const sent = Number(row.sent_today || 0);
  const target = Number(row.target_today || 25);
  return {
    sent_today: sent,
    target_today: target,
    remaining_today: Number(row.remaining_today ?? Math.max(target - sent, 0)),
    customer: Number(row.customer || 0),
    influencer: Number(row.influencer || 0),
    business: Number(row.business || 0),
    brand: Number(row.brand || 0),
    replies_today: Number(row.replies_today || 0),
    new_accounts_from_contacts_today: Number(row.new_accounts_from_contacts_today || 0),
    follow_ups_due: Number(row.follow_ups_due || 0),
    timezone: String(row.timezone || "Europe/Paris"),
    day_start: String(row.day_start || ""),
    day_end: String(row.day_end || ""),
    tableReady: true,
    gmailConnected,
  };
}

export async function fetchOutreachFunnel(workspaceId: string): Promise<OutreachFunnel> {
  const supabase = getServerSupabase();
  if (!supabase) return EMPTY_FUNNEL;
  const { data, error } = await supabase.rpc("hq_outreach_funnel", { p_workspace_id: workspaceId });
  if (error || !data) {
    if (isMissingTable(error)) return EMPTY_FUNNEL;
    return EMPTY_FUNNEL;
  }
  const row = (typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    imported: Number(row.imported || 0),
    emailed: Number(row.emailed || 0),
    replied: Number(row.replied || 0),
    accounts: Number(row.accounts || 0),
    scanned: Number(row.scanned || 0),
    retailer_clicked: Number(row.retailer_clicked || 0),
    customer_accounts: Number(row.customer_accounts || 0),
    influencer_accounts: Number(row.influencer_accounts || 0),
    business_accounts: Number(row.business_accounts || 0),
    brand_accounts: Number(row.brand_accounts || 0),
    contacted_became_users: Number(row.contacted_became_users || 0),
    contacted_to_account_rate:
      row.contacted_to_account_rate == null ? null : Number(row.contacted_to_account_rate),
    imported_to_account_rate:
      row.imported_to_account_rate == null ? null : Number(row.imported_to_account_rate),
    avg_days_contact_to_signup:
      row.avg_days_contact_to_signup == null ? null : Number(row.avg_days_contact_to_signup),
    tableReady: true,
  };
}

export type OutreachEventInput = {
  contactId: string;
  email: string;
  eventType: "email_sent" | "email_reply_received" | "follow_up_sent" | "contact_imported" | "account_created";
  channel?: "gmail" | "loops" | "resend" | "system" | "other";
  direction?: "outbound" | "inbound" | "system";
  provider?: string;
  providerMessageId?: string | null;
  threadId?: string | null;
  subject?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordOutreachEvent(
  supabase: SupabaseClient,
  input: OutreachEventInput
): Promise<{ inserted: boolean; skipped?: string }> {
  const { data: contact, error: contactError } = await supabase
    .from("hq_contacts")
    .select("id, email, outreach_status, first_contacted_at, last_replied_at, account_created_at")
    .eq("id", input.contactId)
    .maybeSingle();
  if (contactError || !contact) {
    return { inserted: false, skipped: contactError?.message || "contact_not_found" };
  }

  const row = {
    contact_id: input.contactId,
    email: input.email,
    channel: input.channel || "gmail",
    direction: input.direction || "outbound",
    provider: input.provider || "gmail",
    provider_message_id: input.providerMessageId || null,
    thread_id: input.threadId || null,
    subject: input.subject || null,
    sent_at: input.sentAt || null,
    received_at: input.receivedAt || null,
    event_type: input.eventType,
    campaign_id: input.campaignId || null,
    metadata: input.metadata || {},
  };

  const { error } = await supabase.from("hq_contact_outreach").insert(row);
  if (error) {
    if (error.code === "23505") return { inserted: false, skipped: "duplicate" };
    return { inserted: false, skipped: error.message };
  }

  const next = nextStatusForEvent(contact.outreach_status, input.eventType);
  const patch: Record<string, unknown> = {
    outreach_status: next,
    updated_at: new Date().toISOString(),
  };

  if (input.eventType === "email_sent" || input.eventType === "follow_up_sent") {
    const sentAt = input.sentAt || new Date().toISOString();
    if (!contact.first_contacted_at) patch.first_contacted_at = sentAt;
    patch.last_contacted_at = sentAt;
    if (next === "contacted" || next === "follow_up_due") {
      const follow = new Date(sentAt);
      follow.setUTCDate(follow.getUTCDate() + FOLLOW_UP_DAYS);
      patch.next_follow_up_at = follow.toISOString();
    }
  }

  if (input.eventType === "email_reply_received") {
    const receivedAt = input.receivedAt || new Date().toISOString();
    patch.last_replied_at = receivedAt;
    patch.next_follow_up_at = null;
  }

  if (input.eventType === "account_created" && !contact.account_created_at) {
    patch.account_created_at = new Date().toISOString();
  }

  await supabase.from("hq_contacts").update(patch).eq("id", input.contactId);
  return { inserted: true };
}

export function isMissingOutreachTable(error: { code?: string; message?: string } | null): boolean {
  return isMissingTable(error);
}

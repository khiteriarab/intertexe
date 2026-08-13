/**
 * HQ Email Engine — source of truth is email_deliveries for every provider
 * (Resend lifecycle + Loops founder welcome). Rows include `provider`.
 * Gmail founder outreach / replies are intentionally out of scope here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_TYPES } from "../email-constants";
import { getServerSupabase } from "../supabase-service-client";

export type EmailProgramStatus = "ACTIVE" | "PLANNED" | "INACTIVE";

export type EmailProgramDef = {
  emailType: string;
  label: string;
  status: EmailProgramStatus;
};

/** Lifecycle + transactional programs. Only ACTIVE rows show live counts. */
export const EMAIL_PROGRAMS: EmailProgramDef[] = [
  { emailType: EMAIL_TYPES.FOUNDER_WELCOME, label: "Founder Welcome", status: "ACTIVE" },
  { emailType: EMAIL_TYPES.LIFECYCLE_DAY4, label: "Day 4", status: "ACTIVE" },
  { emailType: EMAIL_TYPES.LIFECYCLE_DAY10, label: "Day 10", status: "ACTIVE" },
  { emailType: EMAIL_TYPES.LIFECYCLE_DAY25, label: "Day 25", status: "ACTIVE" },
  { emailType: EMAIL_TYPES.WEEKLY_EDIT, label: "Weekly Edit", status: "ACTIVE" },
  { emailType: EMAIL_TYPES.PRICE_DROP, label: "Price Drop", status: "ACTIVE" },
  { emailType: EMAIL_TYPES.SCAN_FOLLOWUP, label: "Scan Follow-up", status: "ACTIVE" },
];

/** Open/click are not persisted — Resend webhook only handles delivery outcomes. */
export const EMAIL_OPEN_CLICK_TRACKED = false;

export type EmailProgramMetrics = {
  emailType: string;
  label: string;
  status: EmailProgramStatus;
  sentToday: number | null;
  sent7d: number | null;
  delivered7d: number | null;
  openRate: number | null;
  clickRate: number | null;
  conversion: number | null;
};

export type EmailStatusTotals = {
  deliveredToday: number;
  bouncedToday: number;
  complainedToday: number;
  failedToday: number;
  delivered7d: number;
  bounced7d: number;
  complained7d: number;
  failed7d: number;
  sentToday: number;
  sent7d: number;
};

export type EmailTodaySummary = {
  byProgram: Array<{ label: string; emailType: string; sentToday: number | null; status: EmailProgramStatus }>;
  deliveredToday: number;
  bouncedToday: number;
  complainedToday: number;
  failedToday: number;
  fetchedAt: string;
};

export type EmailEngineBundle = {
  today: EmailTodaySummary;
  programs: EmailProgramMetrics[];
  statusTotals: EmailStatusTotals;
  recent: Array<{
    id: string;
    email: string;
    emailType: string;
    status: string;
    provider: string | null;
    providerMessageId: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    source: string | null;
  }>;
  openClickTracked: boolean;
  source: "email_deliveries";
  fetchedAt: string;
};

type DeliveryLite = {
  id: string;
  email: string;
  email_type: string;
  status: string;
  provider?: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  failed_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(n: number): Date {
  const d = startOfUtcDay();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function wasSent(row: DeliveryLite): boolean {
  if (row.sent_at) return true;
  return row.status === "sent" || row.status === "delivered";
}

function sentAtMs(row: DeliveryLite): number {
  if (row.sent_at) return Date.parse(row.sent_at);
  if (row.created_at) return Date.parse(row.created_at);
  return NaN;
}

async function loadRecentDeliveries(
  supabase: SupabaseClient,
  sinceIso: string,
  limit = 5000
): Promise<DeliveryLite[]> {
  const { data, error } = await supabase
    .from("email_deliveries")
    .select(
      "id, email, email_type, status, provider, provider_message_id, sent_at, delivered_at, bounced_at, complained_at, failed_at, created_at, metadata"
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("email-engine loadRecentDeliveries:", error.message);
    return [];
  }
  return (data || []) as DeliveryLite[];
}

export async function fetchEmailEngineBundle(): Promise<EmailEngineBundle> {
  const supabase = getServerSupabase();
  const fetchedAt = new Date().toISOString();
  const emptyTotals: EmailStatusTotals = {
    deliveredToday: 0,
    bouncedToday: 0,
    complainedToday: 0,
    failedToday: 0,
    delivered7d: 0,
    bounced7d: 0,
    complained7d: 0,
    failed7d: 0,
    sentToday: 0,
    sent7d: 0,
  };

  if (!supabase) {
    return {
      today: {
        byProgram: EMAIL_PROGRAMS.map((p) => ({
          label: p.label,
          emailType: p.emailType,
          sentToday: p.status === "ACTIVE" ? 0 : null,
          status: p.status,
        })),
        deliveredToday: 0,
        bouncedToday: 0,
        complainedToday: 0,
        failedToday: 0,
        fetchedAt,
      },
      programs: EMAIL_PROGRAMS.map((p) => ({
        emailType: p.emailType,
        label: p.label,
        status: p.status,
        sentToday: p.status === "ACTIVE" ? 0 : null,
        sent7d: p.status === "ACTIVE" ? 0 : null,
        delivered7d: p.status === "ACTIVE" ? 0 : null,
        openRate: null,
        clickRate: null,
        conversion: null,
      })),
      statusTotals: emptyTotals,
      recent: [],
      openClickTracked: EMAIL_OPEN_CLICK_TRACKED,
      source: "email_deliveries",
      fetchedAt,
    };
  }

  const todayStart = startOfUtcDay();
  const weekStart = daysAgoUtc(7);
  const rows = await loadRecentDeliveries(supabase, weekStart.toISOString());

  const byType = new Map<string, { sentToday: number; sent7d: number; delivered7d: number }>();
  for (const p of EMAIL_PROGRAMS) {
    byType.set(p.emailType, { sentToday: 0, sent7d: 0, delivered7d: 0 });
  }

  const statusTotals: EmailStatusTotals = { ...emptyTotals };

  for (const row of rows) {
    const t = byType.get(row.email_type);
    const ms = sentAtMs(row);
    const inToday = Number.isFinite(ms) && ms >= todayStart.getTime();
    const in7d = Number.isFinite(ms) && ms >= weekStart.getTime();

    if (t && wasSent(row)) {
      if (in7d) t.sent7d += 1;
      if (inToday) t.sentToday += 1;
    }
    if (t && (row.status === "delivered" || row.delivered_at) && in7d) {
      t.delivered7d += 1;
    }

    if (wasSent(row)) {
      if (inToday) statusTotals.sentToday += 1;
      if (in7d) statusTotals.sent7d += 1;
    }

    const statusMs = (() => {
      if (row.delivered_at) return Date.parse(row.delivered_at);
      if (row.bounced_at) return Date.parse(row.bounced_at);
      if (row.complained_at) return Date.parse(row.complained_at);
      if (row.failed_at) return Date.parse(row.failed_at);
      return ms;
    })();
    const statusToday = Number.isFinite(statusMs) && statusMs >= todayStart.getTime();
    const status7d = Number.isFinite(statusMs) && statusMs >= weekStart.getTime();

    if (row.status === "delivered" || row.delivered_at) {
      if (statusToday) statusTotals.deliveredToday += 1;
      if (status7d) statusTotals.delivered7d += 1;
    }
    if (row.status === "bounced") {
      if (statusToday) statusTotals.bouncedToday += 1;
      if (status7d) statusTotals.bounced7d += 1;
    }
    if (row.status === "complained") {
      if (statusToday) statusTotals.complainedToday += 1;
      if (status7d) statusTotals.complained7d += 1;
    }
    if (row.status === "failed") {
      if (statusToday) statusTotals.failedToday += 1;
      if (status7d) statusTotals.failed7d += 1;
    }
  }

  const programs: EmailProgramMetrics[] = EMAIL_PROGRAMS.map((p) => {
    if (p.status !== "ACTIVE") {
      return {
        emailType: p.emailType,
        label: p.label,
        status: p.status,
        sentToday: null,
        sent7d: null,
        delivered7d: null,
        openRate: null,
        clickRate: null,
        conversion: null,
      };
    }
    const counts = byType.get(p.emailType) || { sentToday: 0, sent7d: 0, delivered7d: 0 };
    return {
      emailType: p.emailType,
      label: p.label,
      status: p.status,
      sentToday: counts.sentToday,
      sent7d: counts.sent7d,
      delivered7d: counts.delivered7d,
      openRate: null,
      clickRate: null,
      conversion: null,
    };
  });

  const today: EmailTodaySummary = {
    byProgram: programs
      .filter((p) =>
        [
          EMAIL_TYPES.FOUNDER_WELCOME,
          EMAIL_TYPES.LIFECYCLE_DAY4,
          EMAIL_TYPES.LIFECYCLE_DAY10,
          EMAIL_TYPES.LIFECYCLE_DAY25,
          EMAIL_TYPES.WEEKLY_EDIT,
          EMAIL_TYPES.PRICE_DROP,
        ].includes(p.emailType as (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES])
      )
      .map((p) => ({
        label: p.label,
        emailType: p.emailType,
        sentToday: p.sentToday,
        status: p.status,
      })),
    deliveredToday: statusTotals.deliveredToday,
    bouncedToday: statusTotals.bouncedToday,
    complainedToday: statusTotals.complainedToday,
    failedToday: statusTotals.failedToday,
    fetchedAt,
  };

  const recent = rows.slice(0, 40).map((row) => ({
    id: row.id,
    email: row.email,
    emailType: row.email_type,
    status: row.status,
    provider: row.provider || null,
    providerMessageId: row.provider_message_id,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    source:
      row.metadata && typeof row.metadata.source === "string"
        ? row.metadata.source
        : null,
  }));

  return {
    today,
    programs,
    statusTotals,
    recent,
    openClickTracked: EMAIL_OPEN_CLICK_TRACKED,
    source: "email_deliveries",
    fetchedAt,
  };
}

export async function findEmailDeliveryById(id: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("email_deliveries")
    .select("id, email, email_type, status, provider_message_id, sent_at, delivered_at, metadata, created_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

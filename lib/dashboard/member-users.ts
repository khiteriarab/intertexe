/**
 * Member / user counts for INTERTEXE HQ.
 * Users = people in the email lifecycle (Founder Welcome, Day 4/10/25, etc.)
 * merged with registered accounts in user_preferences.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_TYPES } from "../email-constants";
import { getServerSupabase } from "../supabase-service-client";

/** Email programs that represent an INTERTEXE user / member in the lifecycle. */
export const MEMBER_USER_EMAIL_TYPES = [
  EMAIL_TYPES.FOUNDER_WELCOME,
  EMAIL_TYPES.LIFECYCLE_DAY4,
  EMAIL_TYPES.LIFECYCLE_DAY10,
  EMAIL_TYPES.LIFECYCLE_DAY25,
  EMAIL_TYPES.WEEKLY_EDIT,
  EMAIL_TYPES.SCAN_FOLLOWUP,
  EMAIL_TYPES.PRICE_DROP,
  EMAIL_TYPES.SALE_ALERT,
] as const;

export type MemberUserCounts = {
  /** Primary HQ number — union of email lifecycle users + registered accounts */
  total: number;
  today: number;
  d7: number;
  d30: number;
  /** Unique emails with at least one lifecycle delivery */
  emailUsers: number;
  /** Registered accounts (user_preferences) */
  registeredUsers: number;
  /** Ever received Founder Welcome */
  founderWelcomeTotal: number;
  /** Lifecycle emails delivered in last 7d (row count, not unique) */
  lifecycleDelivered7d: number;
  source: "email_deliveries+user_preferences";
};

type DeliveryRow = {
  email: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

function deliveryMs(row: DeliveryRow): number {
  const raw = row.delivered_at || row.sent_at || row.created_at;
  const ms = Date.parse(raw || "");
  return Number.isFinite(ms) ? ms : NaN;
}

function isMemberDelivery(row: DeliveryRow): boolean {
  if (!MEMBER_USER_EMAIL_TYPES.includes(row.email_type as (typeof MEMBER_USER_EMAIL_TYPES)[number])) {
    return false;
  }
  return row.status === "delivered" || row.status === "sent" || Boolean(row.delivered_at || row.sent_at);
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function fetchMemberUserCounts(
  registered?: { total: number; today: number; d7: number; d30: number }
): Promise<MemberUserCounts> {
  const supabase = getServerSupabase();
  const empty: MemberUserCounts = {
    total: registered?.total ?? 0,
    today: registered?.today ?? 0,
    d7: registered?.d7 ?? 0,
    d30: registered?.d30 ?? 0,
    emailUsers: 0,
    registeredUsers: registered?.total ?? 0,
    founderWelcomeTotal: 0,
    lifecycleDelivered7d: 0,
    source: "email_deliveries+user_preferences",
  };
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("email_deliveries")
    .select("email, email_type, status, sent_at, delivered_at, created_at")
    .in("email_type", [...MEMBER_USER_EMAIL_TYPES])
    .order("created_at", { ascending: true })
    .limit(20000);

  if (error) {
    console.error("member-users email_deliveries:", error.message);
    return empty;
  }

  const todayStart = startOfUtcDay().getTime();
  const d7Start = todayStart - 7 * 86400000;
  const d30Start = todayStart - 30 * 86400000;

  const firstSeen = new Map<string, number>();
  const founderWelcome = new Set<string>();
  let lifecycleDelivered7d = 0;

  for (const row of (data || []) as DeliveryRow[]) {
    if (!isMemberDelivery(row)) continue;
    const email = String(row.email || "").trim().toLowerCase();
    if (!email) continue;
    const ms = deliveryMs(row);
    if (!Number.isFinite(ms)) continue;

    if (row.email_type === EMAIL_TYPES.FOUNDER_WELCOME) {
      founderWelcome.add(email);
    }
    if (ms >= d7Start && (row.status === "delivered" || row.delivered_at)) {
      lifecycleDelivered7d += 1;
    }

    const prev = firstSeen.get(email);
    if (prev == null || ms < prev) firstSeen.set(email, ms);
  }

  const emailUsers = firstSeen.size;
  const emailToday = [...firstSeen.values()].filter((ms) => ms >= todayStart && ms < todayStart + 86400000).length;
  const emailD7 = [...firstSeen.values()].filter((ms) => ms >= d7Start).length;
  const emailD30 = [...firstSeen.values()].filter((ms) => ms >= d30Start).length;

  const reg = registered ?? { total: 0, today: 0, d7: 0, d30: 0 };

  return {
    total: Math.max(emailUsers, reg.total),
    today: Math.max(emailToday, reg.today),
    d7: Math.max(emailD7, reg.d7),
    d30: Math.max(emailD30, reg.d30),
    emailUsers,
    registeredUsers: reg.total,
    founderWelcomeTotal: founderWelcome.size,
    lifecycleDelivered7d,
    source: "email_deliveries+user_preferences",
  };
}

/** Count registered accounts directly when RPC is unavailable. */
export async function fetchRegisteredUserCounts(supabase: SupabaseClient): Promise<{
  total: number;
  today: number;
  d7: number;
  d30: number;
}> {
  const todayStart = startOfUtcDay();
  const d7Start = new Date(todayStart);
  d7Start.setUTCDate(d7Start.getUTCDate() - 7);
  const d30Start = new Date(todayStart);
  d30Start.setUTCDate(d30Start.getUTCDate() - 30);

  const { count: total, error } = await supabase
    .from("user_preferences")
    .select("*", { count: "exact", head: true });
  if (error) return { total: 0, today: 0, d7: 0, d30: 0 };

  const [{ count: today }, { count: d7 }, { count: d30 }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("user_preferences")
      .select("*", { count: "exact", head: true })
      .gte("created_at", d7Start.toISOString()),
    supabase
      .from("user_preferences")
      .select("*", { count: "exact", head: true })
      .gte("created_at", d30Start.toISOString()),
  ]);

  return {
    total: total ?? 0,
    today: today ?? 0,
    d7: d7 ?? 0,
    d30: d30 ?? 0,
  };
}

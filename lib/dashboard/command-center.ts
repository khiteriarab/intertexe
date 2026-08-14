import { getServerSupabase } from "../supabase-service-client";
import type { PaidAcquisitionReport } from "./paid-acquisition";
import { classifyPaidPlatform } from "./paid-acquisition";

export type WindowCount = { today: number; d7: number; d30: number; total?: number };

export type OutreachByTypeRow = {
  contacted: number;
  replied: number;
  accounts: number;
  activated: number;
};

export type FounderToday = {
  timezone: string;
  dayStart: string;
  dayEnd: string;
  activationDefinition: "first_scan";
  accounts: WindowCount;
  activated: WindowCount;
  scans: { today: number; d7: number };
  clicks: WindowCount;
  outreach: {
    sentToday: number;
    targetToday: number;
    remainingToday: number;
    customer: number;
    influencer: number;
    business: number;
    brand: number;
    repliesToday: number;
  };
  followUpsDue: number;
  accountsFromContactsToday: number;
  activatedFromContactsToday: number;
  funnel: {
    imported: number;
    emailed: number;
    replied: number;
    accounts: number;
    activated: number;
    retailerClicked: number;
    contactedBecameUsers: number;
  };
  byType: Record<"customer" | "influencer" | "business" | "brand", OutreachByTypeRow>;
  tableReady: boolean;
  gmailConnected: boolean;
  gmailSyncedAt: string | null;
};

const ZERO_TYPE: OutreachByTypeRow = { contacted: 0, replied: 0, accounts: 0, activated: 0 };

const EMPTY: FounderToday = {
  timezone: "Europe/Paris",
  dayStart: "",
  dayEnd: "",
  activationDefinition: "first_scan",
  accounts: { today: 0, d7: 0, d30: 0, total: 0 },
  activated: { today: 0, d7: 0, d30: 0, total: 0 },
  scans: { today: 0, d7: 0 },
  clicks: { today: 0, d7: 0, d30: 0 },
  outreach: {
    sentToday: 0,
    targetToday: 25,
    remainingToday: 25,
    customer: 0,
    influencer: 0,
    business: 0,
    brand: 0,
    repliesToday: 0,
  },
  followUpsDue: 0,
  accountsFromContactsToday: 0,
  activatedFromContactsToday: 0,
  funnel: {
    imported: 0,
    emailed: 0,
    replied: 0,
    accounts: 0,
    activated: 0,
    retailerClicked: 0,
    contactedBecameUsers: 0,
  },
  byType: {
    customer: ZERO_TYPE,
    influencer: ZERO_TYPE,
    business: ZERO_TYPE,
    brand: ZERO_TYPE,
  },
  tableReady: false,
  gmailConnected: false,
  gmailSyncedAt: null,
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function typeRow(raw: unknown): OutreachByTypeRow {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    contacted: num(row.contacted),
    replied: num(row.replied),
    accounts: num(row.accounts),
    activated: num(row.activated),
  };
}

export async function fetchFounderToday(workspaceId: string): Promise<FounderToday> {
  const supabase = getServerSupabase();
  if (!supabase) return EMPTY;

  const [{ data, error }, gmail] = await Promise.all([
    supabase.rpc("hq_founder_today", { p_workspace_id: workspaceId }),
    supabase
      .from("hq_oauth_connections")
      .select("status, last_sync_at, last_sync_status, metadata")
      .eq("workspace_id", workspaceId)
      .eq("provider", "gmail")
      .maybeSingle(),
  ]);

  const gmailConnected = gmail.data?.status === "connected" || gmail.data?.status === "degraded";
  const meta = (gmail.data?.metadata || {}) as Record<string, unknown>;
  const gmailSyncedAt =
    (typeof meta.lastSuccessfulSyncAt === "string" && meta.lastSuccessfulSyncAt) ||
    gmail.data?.last_sync_at ||
    null;

  if (error || !data) return { ...EMPTY, gmailConnected, gmailSyncedAt };
  const row = (typeof data === "object" ? data : {}) as Record<string, unknown>;
  const accounts = (row.accounts || {}) as Record<string, unknown>;
  const activated = (row.activated || {}) as Record<string, unknown>;
  const scans = (row.scans || {}) as Record<string, unknown>;
  const clicks = (row.clicks || {}) as Record<string, unknown>;
  const outreach = (row.outreach || {}) as Record<string, unknown>;
  const funnel = (row.funnel || {}) as Record<string, unknown>;
  const byType = (row.by_type || {}) as Record<string, unknown>;

  return {
    timezone: String(row.timezone || "Europe/Paris"),
    dayStart: String(row.day_start || ""),
    dayEnd: String(row.day_end || ""),
    activationDefinition: "first_scan",
    accounts: {
      today: num(accounts.today),
      d7: num(accounts.d7),
      d30: num(accounts.d30),
      total: num(accounts.total),
    },
    activated: {
      today: num(activated.today),
      d7: num(activated.d7),
      d30: num(activated.d30),
      total: num(activated.total),
    },
    scans: { today: num(scans.today), d7: num(scans.d7) },
    clicks: { today: num(clicks.today), d7: num(clicks.d7), d30: num(clicks.d30) },
    outreach: {
      sentToday: num(outreach.sent_today),
      targetToday: num(outreach.target_today) || 25,
      remainingToday: num(outreach.remaining_today),
      customer: num(outreach.customer),
      influencer: num(outreach.influencer),
      business: num(outreach.business),
      brand: num(outreach.brand),
      repliesToday: num(outreach.replies_today),
    },
    followUpsDue: num(row.follow_ups_due),
    accountsFromContactsToday: num(row.accounts_from_contacts_today),
    activatedFromContactsToday: num(row.activated_from_contacts_today),
    funnel: {
      imported: num(funnel.imported),
      emailed: num(funnel.emailed),
      replied: num(funnel.replied),
      accounts: num(funnel.accounts),
      activated: num(funnel.activated),
      retailerClicked: num(funnel.retailer_clicked),
      contactedBecameUsers: num(funnel.contacted_became_users),
    },
    byType: {
      customer: typeRow(byType.customer),
      influencer: typeRow(byType.influencer),
      business: typeRow(byType.business),
      brand: typeRow(byType.brand),
    },
    tableReady: true,
    gmailConnected,
    gmailSyncedAt,
  };
}

export type SourceRow = {
  id: string;
  label: string;
  accounts: number;
  activated: number;
  clicks: number;
  revenue: number | null;
};

export async function fetchSourceComparison(): Promise<SourceRow[]> {
  const supabase = getServerSupabase();
  const blank: SourceRow[] = [
    { id: "meta_paid", label: "Meta paid", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "tiktok_paid", label: "TikTok paid", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "tiktok_organic", label: "Organic TikTok", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "instagram_organic", label: "Instagram organic", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "direct", label: "Direct", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "founder_outreach", label: "Founder outreach", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "google", label: "Google", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "pinterest", label: "Pinterest", accounts: 0, activated: 0, clicks: 0, revenue: null },
    { id: "other", label: "Other", accounts: 0, activated: 0, clicks: 0, revenue: null },
  ];
  if (!supabase) return blank;

  const [{ data: prefs }, { data: contacts }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("user_id, first_touch_source, first_touch_medium, ttclid, fbclid, gclid")
      .limit(500),
    supabase.from("hq_contacts").select("user_id").not("user_id", "is", null).limit(500),
  ]);

  const outreachIds = new Set(
    (contacts || []).map((c) => String(c.user_id || "")).filter(Boolean)
  );
  const userIds = (prefs || []).map((p) => String(p.user_id || "")).filter(Boolean);
  if (!userIds.length) return blank;

  const [scans, shop, scanner, editorial, tx] = await Promise.all([
    supabase.from("scan_history").select("user_id").in("user_id", userIds).limit(2000),
    supabase.from("user_product_clickouts").select("user_id").in("user_id", userIds).limit(2000),
    supabase.from("scanner_clickouts").select("user_id").in("user_id", userIds).limit(2000),
    supabase.from("editorial_clickouts").select("user_id").in("user_id", userIds).limit(2000),
    supabase
      .from("hq_affiliate_transactions")
      .select("u1, commission_amount, status, raw")
      .not("u1", "is", null)
      .limit(2000),
  ]);

  const scanned = new Set((scans.data || []).map((r) => String((r as { user_id?: string }).user_id || "")));
  const clickCount = new Map<string, number>();
  for (const rows of [shop.data, scanner.data, editorial.data]) {
    for (const r of rows || []) {
      const uid = String((r as { user_id?: string }).user_id || "");
      if (!uid) continue;
      clickCount.set(uid, (clickCount.get(uid) || 0) + 1);
    }
  }
  const revByUser = new Map<string, number>();
  for (const row of tx.data || []) {
    const st = String((row as { status?: string }).status || "").toLowerCase();
    if (st === "demo") continue;
    const uid = String((row as { u1?: string }).u1 || "").trim();
    if (!uid) continue;
    revByUser.set(uid, (revByUser.get(uid) || 0) + (Number((row as { commission_amount?: number }).commission_amount) || 0));
  }

  const map = new Map(blank.map((r) => [r.id, { ...r }]));
  for (const p of prefs || []) {
    const uid = String(p.user_id || "");
    if (!uid) continue;
    let id = "other";
    if (outreachIds.has(uid)) id = "founder_outreach";
    else {
      const platform = classifyPaidPlatform(p);
      const src = String(p.first_touch_source || "").toLowerCase();
      const med = String(p.first_touch_medium || "").toLowerCase();
      const paid = med === "paid" || med === "cpc" || med.includes("ads");
      if (platform === "tiktok" && paid) id = "tiktok_paid";
      else if (platform === "meta" && paid) id = "meta_paid";
      else if (/tiktok/.test(src)) id = "tiktok_organic";
      else if (/instagram|ig\b/.test(src)) id = "instagram_organic";
      else if (/google|gsc|youtube/.test(src)) id = "google";
      else if (/pinterest/.test(src)) id = "pinterest";
      else if (!src || src === "direct" || src === "unknown") id = "direct";
      else id = "other";
    }
    const row = map.get(id);
    if (!row) continue;
    row.accounts += 1;
    if (scanned.has(uid)) row.activated += 1;
    row.clicks += clickCount.get(uid) || 0;
    const rev = revByUser.get(uid);
    if (rev) row.revenue = (row.revenue || 0) + rev;
  }
  return [...map.values()];
}

export type FreshnessRow = { id: string; label: string; at: string | null; note?: string; stale?: boolean };

export async function fetchDataFreshness(workspaceId: string): Promise<FreshnessRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const [{ data: conns }, { data: lastEmail }, { data: lastTx }] = await Promise.all([
    supabase
      .from("hq_oauth_connections")
      .select("provider, last_sync_at, last_sync_status, metadata")
      .eq("workspace_id", workspaceId),
    supabase
      .from("email_deliveries")
      .select("provider, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("hq_affiliate_transactions")
      .select("transaction_date")
      .eq("workspace_id", workspaceId)
      .order("transaction_date", { ascending: false })
      .limit(1),
  ]);

  const byProvider = new Map((conns || []).map((c) => [String(c.provider), c]));
  const staleAfterMs = 36 * 60 * 60 * 1000;
  const isStale = (iso: string | null) => {
    if (!iso) return true;
    const t = Date.parse(iso);
    return !Number.isFinite(t) || Date.now() - t > staleAfterMs;
  };
  const connAt = (id: string) => {
    const c = byProvider.get(id);
    const meta = (c?.metadata || {}) as Record<string, unknown>;
    return (
      (typeof meta.lastSuccessfulSyncAt === "string" && meta.lastSuccessfulSyncAt) ||
      (c?.last_sync_at ? String(c.last_sync_at) : null)
    );
  };

  const loopsAt =
    (lastEmail || []).find((e) => String(e.provider || "").toLowerCase() === "loops")?.sent_at ||
    (lastEmail || []).find((e) => String(e.provider || "").toLowerCase() === "loops")?.created_at ||
    null;
  const resendAt =
    (lastEmail || []).find((e) => String(e.provider || "").toLowerCase() === "resend")?.sent_at ||
    (lastEmail || []).find((e) => String(e.provider || "").toLowerCase() === "resend")?.created_at ||
    null;
  const rakutenAt = lastTx?.[0]?.transaction_date ? String(lastTx[0].transaction_date) : null;

  const rows: FreshnessRow[] = [
    { id: "apple", label: "Apple", at: connAt("app_store_connect") },
    { id: "supabase", label: "Supabase", at: new Date().toISOString(), note: "Live reads" },
    { id: "gmail", label: "Gmail", at: connAt("gmail") },
    { id: "meta", label: "Meta", at: connAt("meta") },
    { id: "tiktok", label: "TikTok", at: connAt("tiktok") },
    { id: "rakuten", label: "Rakuten", at: rakutenAt ? String(rakutenAt) : null },
    { id: "loops", label: "Loops", at: loopsAt ? String(loopsAt) : null },
    { id: "resend", label: "Resend", at: resendAt ? String(resendAt) : null },
  ];
  return rows.map((r) => ({
    ...r,
    stale: r.id === "supabase" ? false : isStale(r.at),
  }));
}

export function buildMoneyMove(input: {
  founder: FounderToday;
  paid: PaidAcquisitionReport;
}): { title: string; body: string } | null {
  const o = input.founder.outreach;
  const f = input.founder.funnel;
  const meta = input.paid.today.meta.accounts;
  const tiktok = input.paid.today.tiktok.accounts;

  if (o.remainingToday > 0 && f.emailed < 8) {
    return {
      title: "Today's money move",
      body: `Finish the remaining ${o.remainingToday} of ${o.targetToday} targeted emails. Outreach conversion vs paid needs more than a test send — don't raise ad spend on this sample.`,
    };
  }
  if (f.emailed >= 8 && f.contactedBecameUsers > 0) {
    const outreachRate = f.contactedBecameUsers / f.emailed;
    if (meta > 0 && outreachRate > 0) {
      const paidRateNote =
        meta >= 5 ? `Paid Meta created ${meta} accounts today.` : `Paid Meta sample is still small (${meta} accounts).`;
      return {
        title: "Today's money move",
        body: `Founder outreach converted ${f.contactedBecameUsers} of ${f.emailed} contacted people into INTERTEXE accounts. ${paidRateNote} Finish the list before increasing spend.`,
      };
    }
    return {
      title: "Today's money move",
      body: `Outreach is producing accounts (${f.contactedBecameUsers} from ${f.emailed} emailed). Keep the daily 25 before scaling paid.`,
    };
  }
  if (input.founder.activated.today > 0 && input.founder.accounts.today === 0) {
    return {
      title: "Today's money move",
      body: "Existing users are scanning. Push another scanner creative today rather than buying more cold traffic.",
    };
  }
  if (tiktok === 0 && meta === 0 && o.remainingToday === 0) {
    return null;
  }
  return null;
}

export function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 1000) / 10}%`;
}

export type RevenueSnapshot = {
  connected: boolean;
  isDemo: boolean;
  commissionToday: number | null;
  commission7d: number | null;
  commission30d: number | null;
  transactionsToday: number | null;
  lastSaleDate: string | null;
};

const EMPTY_REVENUE: RevenueSnapshot = {
  connected: false,
  isDemo: false,
  commissionToday: null,
  commission7d: null,
  commission30d: null,
  transactionsToday: null,
  lastSaleDate: null,
};

function isDemoTx(r: { status?: string | null; raw?: unknown; external_transaction_id?: string | null }) {
  const raw = r.raw && typeof r.raw === "object" ? (r.raw as Record<string, unknown>) : {};
  return r.status === "demo" || raw.is_demo === true || String(r.external_transaction_id || "").startsWith("TX-");
}

/** Rakuten commission only — no catalog joins. */
export async function fetchRevenueSnapshot(workspaceId: string): Promise<RevenueSnapshot> {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return EMPTY_REVENUE;

  const parisToday = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const d30 = new Date();
  d30.setUTCDate(d30.getUTCDate() - 32);
  const since = d30.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("hq_affiliate_transactions")
    .select("transaction_date, commission_amount, status, raw, external_transaction_id")
    .eq("workspace_id", workspaceId)
    .gte("transaction_date", since)
    .order("transaction_date", { ascending: false })
    .limit(500);

  if (error) return EMPTY_REVENUE;

  const verified = (data || []).filter((r) => !isDemoTx(r));
  const isDemo = verified.length === 0 && (data || []).some(isDemoTx);
  if (isDemo) return { ...EMPTY_REVENUE, connected: true, isDemo: true };

  if (!verified.length) {
    const [{ count }, last] = await Promise.all([
      supabase
        .from("hq_affiliate_transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("status", "demo"),
      supabase
        .from("hq_affiliate_transactions")
        .select("transaction_date")
        .eq("workspace_id", workspaceId)
        .neq("status", "demo")
        .order("transaction_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const connected = (count || 0) > 0;
    return {
      ...EMPTY_REVENUE,
      connected,
      commissionToday: connected ? 0 : null,
      commission7d: connected ? 0 : null,
      commission30d: connected ? 0 : null,
      transactionsToday: connected ? 0 : null,
      lastSaleDate: last.data?.transaction_date ? String(last.data.transaction_date).slice(0, 10) : null,
    };
  }

  const dayMs = (iso: string) => Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  const todayMs = Date.parse(`${parisToday}T00:00:00Z`);
  const d7Ms = todayMs - 7 * 86400000;
  const d30Ms = todayMs - 30 * 86400000;

  let commissionToday = 0;
  let commission7d = 0;
  let commission30d = 0;
  let transactionsToday = 0;
  for (const r of verified) {
    const ms = dayMs(String(r.transaction_date || ""));
    if (!Number.isFinite(ms)) continue;
    const amt = Number(r.commission_amount || 0) || 0;
    if (ms >= d30Ms) commission30d += amt;
    if (ms >= d7Ms) commission7d += amt;
    if (String(r.transaction_date).slice(0, 10) === parisToday) {
      commissionToday += amt;
      transactionsToday += 1;
    }
  }

  return {
    connected: true,
    isDemo: false,
    commissionToday,
    commission7d,
    commission30d,
    transactionsToday,
    lastSaleDate: verified[0]?.transaction_date ? String(verified[0].transaction_date).slice(0, 10) : null,
  };
}

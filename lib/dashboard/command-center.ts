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
    brand: number;
    organization: number;
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
  byType: Record<"customer" | "influencer" | "brand" | "organization", OutreachByTypeRow>;
  bd: BdToday;
  tableReady: boolean;
  gmailConnected: boolean;
  gmailSyncedAt: string | null;
};

export type BdToday = {
  introductionsDue: number;
  followUpsDue: number;
  repliesNeedAttention: number;
  highValueAttention: number;
  weekContacted: number;
  weekReplies: number;
  weekAccounts: number;
  weekActivated: number;
  weekByType: { influencer: number; customer: number; brand: number; organization: number };
  yesterdaySent: number;
  yesterdayReplies: number;
  yesterdayRegistrations: number;
  opportunities: { influencer: number; brand: number; organization: number; press: number };
  introQueue: {
    influencer: number;
    customer: number;
    brand: number;
    business: number;
    organization: number;
    press: number;
  };
  canonicalFunnel: {
    discovered: number;
    targeted: number;
    contacted: number;
    engaged: number;
    acquired: number;
    activated: number;
    engagedUser: number;
    commercial: number;
  };
  bySource: Array<{
    source: string;
    discovered: number;
    contacted: number;
    replied: number;
    accounts: number;
    activated: number;
  }>;
};

const ZERO_TYPE: OutreachByTypeRow = { contacted: 0, replied: 0, accounts: 0, activated: 0 };

const EMPTY_BD: BdToday = {
  introductionsDue: 0,
  followUpsDue: 0,
  repliesNeedAttention: 0,
  highValueAttention: 0,
  weekContacted: 0,
  weekReplies: 0,
  weekAccounts: 0,
  weekActivated: 0,
  weekByType: { influencer: 0, customer: 0, brand: 0, organization: 0 },
  yesterdaySent: 0,
  yesterdayReplies: 0,
  yesterdayRegistrations: 0,
  opportunities: { influencer: 0, brand: 0, organization: 0, press: 0 },
  introQueue: { influencer: 0, customer: 0, brand: 0, business: 0, organization: 0, press: 0 },
  canonicalFunnel: {
    discovered: 0,
    targeted: 0,
    contacted: 0,
    engaged: 0,
    acquired: 0,
    activated: 0,
    engagedUser: 0,
    commercial: 0,
  },
  bySource: [],
};

const SOURCE_LABELS: Record<string, string> = {
  founder_network: "Founder network",
  tiktok: "TikTok",
  instagram: "Instagram",
  event: "Event",
  press_research: "Press research",
  creator_research: "Creator research",
  brand_research: "Brand research",
  organization_outreach: "Organization outreach",
  referral: "Referral",
  google_sheet_legacy: "Google Sheet (legacy)",
  inbound: "Inbound",
};

export function sourceLabel(key: string | null | undefined): string {
  const k = String(key || "");
  return SOURCE_LABELS[k] || k || "Unknown";
}

function parseBd(raw: unknown): BdToday {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const opp = (row.opportunities || {}) as Record<string, unknown>;
  const intro = (row.intro_queue || {}) as Record<string, unknown>;
  const funnel = (row.canonical_funnel || {}) as Record<string, unknown>;
  const sources = Array.isArray(row.by_source) ? row.by_source : [];
  return {
    introductionsDue: num(row.introductions_due),
    followUpsDue: num(row.follow_ups_due),
    repliesNeedAttention: num(row.replies_need_attention),
    highValueAttention: num(row.high_value_attention),
    weekContacted: num(row.week_contacted),
    weekReplies: num(row.week_replies),
    weekAccounts: num(row.week_accounts),
    weekActivated: num(row.week_activated),
    weekByType: {
      influencer: num((row.week_by_type as Record<string, unknown> | undefined)?.influencer),
      customer: num((row.week_by_type as Record<string, unknown> | undefined)?.customer),
      brand: num((row.week_by_type as Record<string, unknown> | undefined)?.brand),
      organization:
        num((row.week_by_type as Record<string, unknown> | undefined)?.organization) +
        num((row.week_by_type as Record<string, unknown> | undefined)?.business),
    },
    yesterdaySent: num(row.yesterday_sent),
    yesterdayReplies: num(row.yesterday_replies),
    yesterdayRegistrations: num(row.yesterday_registrations),
    opportunities: {
      influencer: num(opp.influencer),
      brand: num(opp.brand),
      organization: num(opp.organization),
      press: num(opp.press),
    },
    introQueue: {
      influencer: num(intro.influencer),
      customer: num(intro.customer),
      brand: num(intro.brand),
      business: num(intro.business),
      organization: num(intro.organization) + num(intro.business),
      press: num(intro.press),
    },
    canonicalFunnel: {
      discovered: num(funnel.discovered),
      targeted: num(funnel.targeted),
      contacted: num(funnel.contacted),
      engaged: num(funnel.engaged),
      acquired: num(funnel.acquired),
      activated: num(funnel.activated),
      engagedUser: num(funnel.engaged_user),
      commercial: num(funnel.commercial),
    },
    bySource: sources.map((s) => {
      const r = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return {
        source: String(r.source || ""),
        discovered: num(r.discovered),
        contacted: num(r.contacted),
        replied: num(r.replied),
        accounts: num(r.accounts),
        activated: num(r.activated),
      };
    }),
  };
}

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
    brand: 0,
    organization: 0,
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
    brand: ZERO_TYPE,
    organization: ZERO_TYPE,
  },
  bd: EMPTY_BD,
  tableReady: false,
  gmailConnected: false,
  gmailSyncedAt: null,
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mergeTypeRows(a: OutreachByTypeRow, b: OutreachByTypeRow): OutreachByTypeRow {
  return {
    contacted: a.contacted + b.contacted,
    replied: a.replied + b.replied,
    accounts: a.accounts + b.accounts,
    activated: a.activated + b.activated,
  };
}

export type CanonicalOutreachType = "influencer" | "customer" | "brand" | "organization";

export function canonicalOutreachType(raw: string | null | undefined): CanonicalOutreachType | null {
  const type = String(raw || "").trim().toLowerCase();
  if (type === "influencer" || type === "customer" || type === "brand") return type;
  if (type === "organization" || type === "business") return "organization";
  return null;
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

  const result: FounderToday = {
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
      brand: num(outreach.brand),
      organization: num(outreach.organization) + num(outreach.business),
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
      brand: typeRow(byType.brand),
      organization: mergeTypeRows(typeRow(byType.organization), typeRow(byType.business)),
    },
    bd: parseBd(row.bd),
    tableReady: true,
    gmailConnected,
    gmailSyncedAt,
  };

  if (!result.bd.canonicalFunnel.discovered && result.funnel.imported) {
    result.bd = await deriveBdFromContacts(workspaceId, result);
  }
  return result;
}

function inWindow(iso: string | null | undefined, startMs: number, endMs: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t >= startMs && t < endMs;
}

function mapSourceKey(raw: string | null | undefined, sheetTab: string | null | undefined): string {
  const s = String(raw || "").trim().toLowerCase();
  if (SOURCE_LABELS[s]) return s;
  if (["xlsx_import", "google_sheet", "sheet", "spreadsheet"].includes(s)) return "google_sheet_legacy";
  if (["gmail_signoff", "founder", "personal"].includes(s)) return "founder_network";
  if (!s) return sheetTab ? "google_sheet_legacy" : "founder_network";
  return "google_sheet_legacy";
}

async function deriveBdFromContacts(workspaceId: string, founder: FounderToday): Promise<BdToday> {
  const supabase = getServerSupabase();
  if (!supabase) return founder.bd;

  const { data, error } = await supabase
    .from("hq_contacts")
    .select(
      "contact_type, outreach_status, source, sheet_tab, last_contacted_at, last_replied_at, next_follow_up_at, user_id, account_created_at, added_at"
    )
    .eq("workspace_id", workspaceId)
    .limit(500);
  if (error || !data?.length) return founder.bd;

  const userIds = [...new Set(data.map((c) => String(c.user_id || "")).filter(Boolean))];
  const scanCount = new Map<string, number>();
  if (userIds.length) {
    const scans = await supabase.from("scan_history").select("user_id").in("user_id", userIds).limit(2000);
    for (const row of scans.data || []) {
      const uid = String((row as { user_id?: string }).user_id || "");
      if (!uid) continue;
      scanCount.set(uid, (scanCount.get(uid) || 0) + 1);
    }
  }

  const tz = founder.timezone || "Europe/Paris";
  const dayStart = founder.dayStart ? Date.parse(founder.dayStart) : Date.now();
  const dayEnd = founder.dayEnd ? Date.parse(founder.dayEnd) : dayStart + 86400000;
  const yStart = dayStart - 86400000;
  const d7 = dayStart - 7 * 86400000;
  const follow1Ms = 4 * 86400000;
  const now = Date.now();

  const bd: BdToday = {
    ...EMPTY_BD,
    introQueue: { ...EMPTY_BD.introQueue },
    opportunities: { ...EMPTY_BD.opportunities },
    canonicalFunnel: { ...EMPTY_BD.canonicalFunnel },
    weekByType: { ...EMPTY_BD.weekByType },
  };

  const sourceMap = new Map<string, BdToday["bySource"][number]>();
  const bumpIntro = (type: string) => {
    const canonical = canonicalOutreachType(type);
    if (canonical) {
      bd.introQueue[canonical] += 1;
    }
  };

  for (const c of data) {
    const type = String(c.contact_type || "other");
    const status = String(c.outreach_status || "not_contacted");
    const inactive = status === "not_interested" || status === "dormant";
    const uid = c.user_id ? String(c.user_id) : "";
    const scans = uid ? scanCount.get(uid) || 0 : 0;
    const lastSend = c.last_contacted_at ? Date.parse(String(c.last_contacted_at)) : NaN;
    const lastReply = c.last_replied_at ? Date.parse(String(c.last_replied_at)) : NaN;
    const src = mapSourceKey(c.source, c.sheet_tab);
    const srcRow = sourceMap.get(src) || {
      source: src,
      discovered: 0,
      contacted: 0,
      replied: 0,
      accounts: 0,
      activated: 0,
    };
    srcRow.discovered += 1;
    if (c.last_contacted_at) srcRow.contacted += 1;
    if (c.last_replied_at) srcRow.replied += 1;
    if (uid) srcRow.accounts += 1;
    if (scans >= 1) srcRow.activated += 1;
    sourceMap.set(src, srcRow);

    bd.canonicalFunnel.discovered += 1;
    if (!inactive) bd.canonicalFunnel.targeted += 1;
    if (c.last_contacted_at) bd.canonicalFunnel.contacted += 1;
    if (c.last_replied_at) bd.canonicalFunnel.engaged += 1;
    if (uid) bd.canonicalFunnel.acquired += 1;
    if (scans >= 1) bd.canonicalFunnel.activated += 1;
    if (scans >= 2) bd.canonicalFunnel.engagedUser += 1;

    if (inWindow(c.last_contacted_at, d7, dayEnd)) {
      bd.weekContacted += 1;
      const weekType = canonicalOutreachType(type);
      if (weekType) bd.weekByType[weekType] += 1;
    }
    if (inWindow(c.last_replied_at, d7, dayEnd)) bd.weekReplies += 1;
    if (inWindow(c.account_created_at, d7, dayEnd)) bd.weekAccounts += 1;
    if (inWindow(c.account_created_at, yStart, dayStart)) bd.yesterdayRegistrations += 1;

    if (inactive) continue;
    if (uid && scans >= 2) {
      bd.highValueAttention += 1;
      continue;
    }
    if (uid) continue;
    if (Number.isFinite(lastReply) && (!Number.isFinite(lastSend) || lastReply >= lastSend)) {
      bd.repliesNeedAttention += 1;
      if (type === "influencer" || type === "brand" || type === "organization" || type === "business" || type === "press") {
        const oppType = canonicalOutreachType(type);
        if (oppType === "brand" || oppType === "influencer" || oppType === "organization") {
          bd.opportunities[oppType] += 1;
        } else if (type === "press") {
          bd.opportunities.press += 1;
        }
      }
      continue;
    }
    if (!c.last_contacted_at) {
      bd.introductionsDue += 1;
      bumpIntro(type);
      continue;
    }
    const due =
      (c.next_follow_up_at && Date.parse(String(c.next_follow_up_at)) <= now) ||
      (Number.isFinite(lastSend) && now >= lastSend + follow1Ms);
    if (due) bd.followUpsDue += 1;
  }

  bd.canonicalFunnel.commercial = founder.funnel.retailerClicked;
  bd.bySource = [...sourceMap.values()].sort((a, b) => b.discovered - a.discovered);
  bd.yesterdaySent = 0;
  bd.yesterdayReplies = 0;

  const { data: events } = await supabase
    .from("hq_contact_outreach")
    .select("event_type, sent_at, received_at, created_at, channel")
    .gte("created_at", new Date(yStart).toISOString())
    .limit(200);
  for (const e of events || []) {
    const sent = e.sent_at ? Date.parse(String(e.sent_at)) : NaN;
    const rec = Date.parse(String(e.received_at || e.created_at || ""));
    if (e.event_type === "email_sent" || e.event_type === "follow_up_sent") {
      if (e.channel === "gmail" && sent >= yStart && sent < dayStart) bd.yesterdaySent += 1;
    }
    if (e.event_type === "email_reply_received" && rec >= yStart && rec < dayStart) bd.yesterdayReplies += 1;
  }

  return bd;
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

export function buildBdBriefing(founder: FounderToday): {
  title: string;
  lines: string[];
  priority: string;
} {
  const o = founder.outreach;
  const bd = founder.bd;
  const introsToday = Math.min(o.remainingToday, bd.introductionsDue);
  const date = new Date().toLocaleDateString("en-US", {
    timeZone: founder.timezone || "Europe/Paris",
    month: "short",
    day: "numeric",
  }).toUpperCase();

  const queue = bd.introQueue;
  const queueEntries = (
    [
      ["Influencers", queue.influencer],
      ["Customers", queue.customer],
      ["Brands", queue.brand],
      ["Organizations", queue.organization + queue.business],
    ] as const
  ).filter(([, n]) => n > 0);
  queueEntries.sort((a, b) => b[1] - a[1]);
  const topQueue = queueEntries[0];

  const typeRows = [
    ["Influencers", founder.byType.influencer],
    ["Customers", founder.byType.customer],
    ["Brands", founder.byType.brand],
    ["Organizations", founder.byType.organization],
  ] as const;
  const comparable = typeRows.filter(([, r]) => r.contacted >= 8);
  let conversionNote = "Conversion by type needs more than a test send.";
  if (comparable.length >= 2) {
    const scored = comparable
      .map(([label, r]) => ({ label, rate: r.accounts / r.contacted, n: r.contacted }))
      .sort((a, b) => b.rate - a.rate);
    const best = scored[0];
    const rest = scored[1];
    if (rest && rest.rate > 0 && best.rate / rest.rate >= 1.5) {
      conversionNote = `Last contacted → account: ${best.label} ${(best.rate * 100).toFixed(0)}% vs ${rest.label} ${(rest.rate * 100).toFixed(0)}% (n≥8).`;
    } else if (best) {
      conversionNote = `${best.label} lead contacted → account at ${(best.rate * 100).toFixed(0)}% (n=${best.n}).`;
    }
  }

  const priority = topQueue
    ? `Priority today: ${topQueue[0]} (${topQueue[1]} introductions waiting). ${conversionNote}`
    : conversionNote;

  return {
    title: `INTERTEXE BD — ${date}`,
    lines: [
      `Goal: ${o.targetToday} new contacts`,
      `${introsToday} introductions to send · ${bd.followUpsDue} follow-ups due · ${bd.repliesNeedAttention} replies need a human response`,
      `${founder.accountsFromContactsToday} contacts became users today · ${bd.highValueAttention} high-value relationships need attention`,
      `Yesterday: ${bd.yesterdaySent} sent → ${bd.yesterdayReplies} replies → ${bd.yesterdayRegistrations} registrations`,
    ],
    priority,
  };
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

/** Europe/Paris calendar midnight as UTC ms (matches hq_founder_today day_start). */
function startOfDayInTimeZone(timeZone: string, date = new Date()): number {
  const dateStr = date.toLocaleDateString("en-CA", { timeZone });
  let left = date.getTime() - 36 * 3600 * 1000;
  let right = date.getTime() + 36 * 3600 * 1000;
  while (right - left > 500) {
    const mid = Math.floor((left + right) / 2);
    const midStr = new Date(mid).toLocaleDateString("en-CA", { timeZone });
    if (midStr < dateStr) left = mid;
    else right = mid;
  }
  return right;
}

export type AppDownloadChannelKey = "website" | "meta" | "tiktok" | "email" | "qr" | "other";

export type AppDownloadClicksReport = {
  today: number;
  d7: number;
  d30: number;
  byChannel: Record<AppDownloadChannelKey, number>;
  bySourceCampaign: Array<{
    source: string;
    campaign: string;
    channel: AppDownloadChannelKey;
    count: number;
  }>;
  timezone: string;
};

const EMPTY_APP_DL: AppDownloadClicksReport = {
  today: 0,
  d7: 0,
  d30: 0,
  byChannel: { website: 0, meta: 0, tiktok: 0, email: 0, qr: 0, other: 0 },
  bySourceCampaign: [],
  timezone: "Europe/Paris",
};

/**
 * First-party App Store / /open CTA clicks from hq_customer_events.
 * Not Apple App Units. Not account creation.
 */
export async function fetchAppDownloadClicks(
  workspaceId: string
): Promise<AppDownloadClicksReport> {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return EMPTY_APP_DL;

  const tz = "Europe/Paris";
  const dayStart = startOfDayInTimeZone(tz);
  const dayEnd = dayStart + 86400000;
  const d7 = dayStart - 7 * 86400000;
  const d30 = dayStart - 30 * 86400000;

  const { data, error } = await supabase
    .from("hq_customer_events")
    .select("event_timestamp, metadata")
    .eq("workspace_id", workspaceId)
    .eq("event_name", "app_download_click")
    .gte("event_timestamp", new Date(d30).toISOString())
    .lt("event_timestamp", new Date(dayEnd).toISOString())
    .order("event_timestamp", { ascending: false })
    .limit(2000);

  if (error || !data) return EMPTY_APP_DL;

  const byChannel: Record<AppDownloadChannelKey, number> = {
    website: 0,
    meta: 0,
    tiktok: 0,
    email: 0,
    qr: 0,
    other: 0,
  };
  const campaignMap = new Map<string, AppDownloadClicksReport["bySourceCampaign"][number]>();
  let today = 0;
  let d7Count = 0;
  let d30Count = 0;

  for (const row of data) {
    const ts = Date.parse(String(row.event_timestamp || ""));
    if (!Number.isFinite(ts)) continue;
    d30Count += 1;
    if (ts >= d7) d7Count += 1;
    if (ts >= dayStart && ts < dayEnd) today += 1;

    const meta = (row.metadata && typeof row.metadata === "object"
      ? row.metadata
      : {}) as Record<string, unknown>;
    const channelRaw = String(meta.channel || "other").toLowerCase();
    const channel: AppDownloadChannelKey =
      channelRaw === "website" ||
      channelRaw === "meta" ||
      channelRaw === "tiktok" ||
      channelRaw === "email" ||
      channelRaw === "qr"
        ? channelRaw
        : "other";
    byChannel[channel] += 1;

    const source = String(meta.utm_source || "").trim() || "(none)";
    const campaign = String(meta.utm_campaign || "").trim() || "(none)";
    const key = `${source}||${campaign}||${channel}`;
    const existing = campaignMap.get(key);
    if (existing) existing.count += 1;
    else campaignMap.set(key, { source, campaign, channel, count: 1 });
  }

  const bySourceCampaign = [...campaignMap.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  return {
    today,
    d7: d7Count,
    d30: d30Count,
    byChannel,
    bySourceCampaign,
    timezone: tz,
  };
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

import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail } from "../email-constants";
import { canonicalizeContactType } from "../hq-contacts";
import { getValidAccessToken } from "./integrations/connections";

/** Fields Google Sheets may write. Everything else stays Supabase-owned. */
export const SHEET_OWNED_FIELDS = [
  "email",
  "normalized_email",
  "first_name",
  "last_name",
  "full_name",
  "name",
  "company_name",
  "notes",
  "campaign",
  "contact_type",
  "source",
  "sheet_tab",
] as const;

export const SUPABASE_OWNED_FIELDS = [
  "outreach_status",
  "user_id",
  "first_contacted_at",
  "last_contacted_at",
  "last_replied_at",
  "next_follow_up_at",
  "marketing_eligible",
  "consent_at",
] as const;

const TAB_TYPES = ["customer", "influencer", "business", "brand", "organization"] as const;
export type SheetContactType = (typeof TAB_TYPES)[number];

export type SheetOwnedRecord = {
  email: string;
  normalized_email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  name: string | null;
  company_name: string | null;
  notes: string | null;
  campaign: string | null;
  contact_type: SheetContactType;
  sheet_tab: string;
  source: "google_sheet";
};

export type ExistingContact = {
  id: string;
  normalized_email: string;
  contact_type: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  name: string | null;
  company_name: string | null;
  notes: string | null;
  campaign: string | null;
  source: string | null;
  sheet_tab: string | null;
  outreach_status: string | null;
  user_id: string | null;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  last_replied_at: string | null;
};

export type PlannedInsert = SheetOwnedRecord & {
  user_id: string | null;
  outreach_status: "not_contacted" | "converted";
  marketing_eligible: false;
};

export type PlannedUpdate = {
  id: string;
  patch: Partial<Pick<SheetOwnedRecord, Exclude<keyof SheetOwnedRecord, "email" | "normalized_email">>>;
};

export type SheetSyncPlan = {
  insert: PlannedInsert[];
  update: PlannedUpdate[];
  alreadyCurrent: number;
  dupesInSheet: Array<{ email: string; keptType: string; droppedType: string; tab: string }>;
  invalid: number;
  skippedUnmappedTabs: string[];
};

export type SheetSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  spreadsheetId?: string;
  inserted: number;
  updated: number;
  alreadyCurrent: number;
  dupesInSheet: number;
  invalid: number;
  linkedUsers: number;
  errors: string[];
};

const HEADER_ALIASES: Record<keyof Pick<
  SheetOwnedRecord,
  "email" | "first_name" | "last_name" | "full_name" | "company_name" | "notes" | "campaign"
>, string[]> = {
  email: ["email", "e-mail", "email_address", "mail"],
  first_name: ["first_name", "firstname", "first"],
  last_name: ["last_name", "lastname", "last"],
  full_name: ["name", "full_name", "fullname"],
  company_name: ["company", "company_name", "organization", "brand"],
  notes: ["notes", "note", "comments"],
  campaign: ["campaign", "utm_campaign"],
};

function blankToNull(value: string | null | undefined): string | null {
  const v = String(value || "").trim();
  return v ? v : null;
}

export function parseSheetId(raw: string | null | undefined): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  const fromUrl = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return fromUrl ? fromUrl[1] : t;
}

export function typeFromTabTitle(title: string): SheetContactType | null {
  const v = canonicalizeContactType(title);
  if ((TAB_TYPES as readonly string[]).includes(v)) return v as SheetContactType;
  return null;
}

export function headerIndexMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    map[String(h || "").trim().toLowerCase().replace(/\s+/g, "_")] = i;
  });
  return map;
}

function col(map: Record<string, number>, row: string[], names: string[]): string {
  for (const n of names) {
    const idx = map[n];
    if (idx != null && row[idx]) return String(row[idx]).trim();
  }
  return "";
}

export function rowToSheetContact(
  tabTitle: string,
  contactType: SheetContactType,
  headerMap: Record<string, number>,
  row: string[]
): SheetOwnedRecord | { invalid: true } {
  const email = normalizeEmail(col(headerMap, row, HEADER_ALIASES.email));
  if (!email || !email.includes("@")) return { invalid: true };
  const first = blankToNull(col(headerMap, row, HEADER_ALIASES.first_name));
  const last = blankToNull(col(headerMap, row, HEADER_ALIASES.last_name));
  const full =
    blankToNull(col(headerMap, row, HEADER_ALIASES.full_name)) ||
    blankToNull([first, last].filter(Boolean).join(" "));
  return {
    email,
    normalized_email: email,
    first_name: first,
    last_name: last,
    full_name: full,
    name: full,
    company_name: blankToNull(col(headerMap, row, HEADER_ALIASES.company_name)),
    notes: blankToNull(col(headerMap, row, HEADER_ALIASES.notes)),
    campaign: blankToNull(col(headerMap, row, HEADER_ALIASES.campaign)),
    contact_type: contactType,
    sheet_tab: tabTitle,
    source: "google_sheet",
  };
}

function sheetPatch(
  incoming: SheetOwnedRecord,
  existing: ExistingContact
): PlannedUpdate["patch"] | null {
  const patch: PlannedUpdate["patch"] = {};
  const assign = <K extends keyof PlannedUpdate["patch"]>(key: K, value: PlannedUpdate["patch"][K]) => {
    if (value && value !== (existing as Record<string, unknown>)[key as string]) {
      patch[key] = value;
    }
  };
  assign("first_name", incoming.first_name);
  assign("last_name", incoming.last_name);
  assign("full_name", incoming.full_name);
  assign("name", incoming.name);
  assign("company_name", incoming.company_name);
  assign("notes", incoming.notes);
  assign("campaign", incoming.campaign);
  if (incoming.source && incoming.source !== existing.source) patch.source = incoming.source;
  if (incoming.sheet_tab && incoming.sheet_tab !== existing.sheet_tab) patch.sheet_tab = incoming.sheet_tab;
  if (incoming.contact_type && incoming.contact_type !== existing.contact_type) {
    patch.contact_type = incoming.contact_type;
  }
  return Object.keys(patch).length ? patch : null;
}

export function assertNoSupabaseOwnedFields(patch: Record<string, unknown>): void {
  for (const key of SUPABASE_OWNED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      throw new Error(`Sheet sync must not write ${key}`);
    }
  }
}

export function planSheetContactSync(args: {
  incoming: SheetOwnedRecord[];
  existing: ExistingContact[];
  usersByEmail: Map<string, string>;
}): SheetSyncPlan {
  const existingByEmail = new Map(args.existing.map((r) => [r.normalized_email, r]));
  const seen = new Map<string, SheetOwnedRecord>();
  const plan: SheetSyncPlan = {
    insert: [],
    update: [],
    alreadyCurrent: 0,
    dupesInSheet: [],
    invalid: 0,
    skippedUnmappedTabs: [],
  };

  for (const row of args.incoming) {
    const prev = seen.get(row.normalized_email);
    if (prev) {
      plan.dupesInSheet.push({
        email: row.email,
        keptType: prev.contact_type,
        droppedType: row.contact_type,
        tab: row.sheet_tab,
      });
      continue;
    }
    seen.set(row.normalized_email, row);
  }

  for (const row of seen.values()) {
    const already = existingByEmail.get(row.normalized_email);
    if (!already) {
      const userId = args.usersByEmail.get(row.normalized_email) || null;
      plan.insert.push({
        ...row,
        user_id: userId,
        outreach_status: userId ? "converted" : "not_contacted",
        marketing_eligible: false,
      });
      continue;
    }
    const patch = sheetPatch(row, already);
    if (!patch) {
      plan.alreadyCurrent += 1;
      continue;
    }
    assertNoSupabaseOwnedFields(patch as Record<string, unknown>);
    plan.update.push({ id: already.id, patch });
  }

  return plan;
}

export function configuredContactsSheetId(): string {
  return parseSheetId(process.env.HQ_CONTACTS_SHEET_ID);
}

export function gmailHasSheetsScope(scopes: string[] | null | undefined): boolean {
  return (scopes || []).some((s) => s.includes("spreadsheets.readonly"));
}

export async function resolveContactsSheetId(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string> {
  const { data } = await supabase
    .from("hq_data_sources")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("key", "google_contacts_sheet")
    .maybeSingle();
  const config = (data?.config || {}) as { spreadsheetId?: string; sheetUrl?: string };
  return (
    parseSheetId(config.spreadsheetId) ||
    parseSheetId(config.sheetUrl) ||
    configuredContactsSheetId()
  );
}

export async function saveContactsSheetUrl(
  supabase: SupabaseClient,
  workspaceId: string,
  rawUrl: string
): Promise<{ spreadsheetId: string; sheetUrl: string }> {
  const spreadsheetId = parseSheetId(rawUrl);
  if (!spreadsheetId) throw new Error("Paste a Google Sheet URL (or the id from /d/…/).");
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const { data: existing } = await supabase
    .from("hq_data_sources")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("key", "google_contacts_sheet")
    .maybeSingle();
  const config = { ...((existing?.config || {}) as Record<string, unknown>), spreadsheetId, sheetUrl };
  const { error } = await supabase.from("hq_data_sources").upsert(
    {
      workspace_id: workspaceId,
      key: "google_contacts_sheet",
      label: "Google contacts sheet",
      status: "not_connected",
      sync_frequency: "hourly",
      config,
      error_message: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,key" }
  );
  if (error) throw new Error(error.message);
  return { spreadsheetId, sheetUrl };
}

type ServiceAccount = { client_email: string; private_key: string };

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.HQ_CONTACTS_GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as { client_email?: string; private_key?: string };
    if (!sa.client_email || !sa.private_key) return null;
    return {
      client_email: sa.client_email,
      private_key: sa.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

async function accessTokenFromServiceAccount(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const jwt = `${header}.${payload}.${signer.sign(sa.private_key, "base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Service account token failed");
  }
  return json.access_token;
}

async function sheetsAccessToken(supabase: SupabaseClient, workspaceId: string): Promise<string> {
  const sa = parseServiceAccount();
  if (sa) return accessTokenFromServiceAccount(sa);
  const { accessToken } = await getValidAccessToken(supabase, workspaceId, "gmail");
  return accessToken;
}

async function sheetsJson(
  accessToken: string,
  path: string
): Promise<{ ok: boolean; json: Record<string, unknown>; status: number }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, json, status: res.status };
}

function encodeA1Sheet(title: string): string {
  return `'${title.replace(/'/g, "''")}'!A:Z`;
}

type SheetTab = { title: string; contactType: SheetContactType };

export async function loadSheetOwnedRecords(args: {
  accessToken: string;
  spreadsheetId: string;
}): Promise<{
  records: SheetOwnedRecord[];
  skippedUnmappedTabs: string[];
  errors: string[];
  invalid: number;
}> {
  const meta = await sheetsJson(
    args.accessToken,
    `spreadsheets/${encodeURIComponent(args.spreadsheetId)}?fields=sheets.properties.title`
  );
  if (!meta.ok) {
    const err = meta.json.error as { message?: string } | undefined;
    const message = err?.message || `Sheets metadata HTTP ${meta.status}`;
    if (meta.status === 403) {
      return {
        records: [],
        skippedUnmappedTabs: [],
        invalid: 0,
        errors: [
          `${message}. Reconnect Gmail outreach (adds spreadsheets.readonly) or share the sheet with the service account.`,
        ],
      };
    }
    return { records: [], skippedUnmappedTabs: [], invalid: 0, errors: [message] };
  }

  const sheets = (meta.json.sheets as Array<{ properties?: { title?: string } }> | undefined) || [];
  const skippedUnmappedTabs: string[] = [];
  const tabs: SheetTab[] = [];
  for (const sheet of sheets) {
    const title = String(sheet.properties?.title || "").trim();
    if (!title) continue;
    const contactType = typeFromTabTitle(title);
    if (!contactType) {
      skippedUnmappedTabs.push(title);
      continue;
    }
    tabs.push({ title, contactType });
  }

  const records: SheetOwnedRecord[] = [];
  const errors: string[] = [];
  let invalid = 0;
  for (const tab of tabs) {
    const range = encodeURIComponent(encodeA1Sheet(tab.title));
    const values = await sheetsJson(
      args.accessToken,
      `spreadsheets/${encodeURIComponent(args.spreadsheetId)}/values/${range}`
    );
    if (!values.ok) {
      const err = values.json.error as { message?: string } | undefined;
      errors.push(`${tab.title}: ${err?.message || `HTTP ${values.status}`}`);
      continue;
    }
    const rows = (values.json.values as string[][] | undefined) || [];
    if (!rows.length) continue;
    let headerRowIdx = 0;
    while (headerRowIdx < Math.min(rows.length, 5)) {
      const candidate = headerIndexMap((rows[headerRowIdx] || []).map((h) => String(h || "")));
      if (HEADER_ALIASES.email.some((n) => candidate[n] != null)) break;
      headerRowIdx += 1;
    }
    if (headerRowIdx >= rows.length) continue;
    const map = headerIndexMap(rows[headerRowIdx].map((h) => String(h || "")));
    for (const row of rows.slice(headerRowIdx + 1)) {
      const parsed = rowToSheetContact(tab.title, tab.contactType, map, row.map((c) => String(c || "")));
      if ("invalid" in parsed) {
        invalid += 1;
        continue;
      }
      records.push(parsed);
    }
  }
  return { records, skippedUnmappedTabs, errors, invalid };
}

export async function syncHqContactsFromSheet(args: {
  supabase: SupabaseClient;
  workspaceId: string;
}): Promise<SheetSyncResult> {
  const spreadsheetId = await resolveContactsSheetId(args.supabase, args.workspaceId);
  const empty: SheetSyncResult = {
    ok: true,
    skipped: true,
    inserted: 0,
    updated: 0,
    alreadyCurrent: 0,
    dupesInSheet: 0,
    invalid: 0,
    linkedUsers: 0,
    errors: [],
  };
  if (!spreadsheetId) {
    return { ...empty, reason: "Contact sheet URL not set" };
  }

  let accessToken: string;
  try {
    accessToken = await sheetsAccessToken(args.supabase, args.workspaceId);
  } catch (e) {
    return {
      ...empty,
      ok: false,
      skipped: true,
      reason: e instanceof Error ? e.message : "Sheets auth failed",
      spreadsheetId,
    };
  }

  const loaded = await loadSheetOwnedRecords({ accessToken, spreadsheetId });
  if (loaded.errors.length && !loaded.records.length) {
    return {
      ...empty,
      ok: false,
      skipped: false,
      reason: loaded.errors[0],
      spreadsheetId,
      errors: loaded.errors,
    };
  }

  const [{ data: existing, error: existingErr }, { data: prefs }] = await Promise.all([
    args.supabase
      .from("hq_contacts")
      .select(
        "id, normalized_email, contact_type, first_name, last_name, full_name, name, company_name, notes, campaign, source, sheet_tab, outreach_status, user_id, first_contacted_at, last_contacted_at, last_replied_at"
      )
      .eq("workspace_id", args.workspaceId),
    args.supabase.from("user_preferences").select("user_id, email"),
  ]);
  if (existingErr) {
    return { ...empty, ok: false, spreadsheetId, errors: [existingErr.message], reason: existingErr.message };
  }

  const usersByEmail = new Map<string, string>();
  for (const p of prefs || []) {
    const email = normalizeEmail(String((p as { email?: string }).email || ""));
    const userId = String((p as { user_id?: string }).user_id || "");
    if (email && userId) usersByEmail.set(email, userId);
  }

  const plan = planSheetContactSync({
    incoming: loaded.records,
    existing: (existing || []) as ExistingContact[],
    usersByEmail,
  });
  plan.invalid = loaded.invalid;
  plan.skippedUnmappedTabs = loaded.skippedUnmappedTabs;

  const result: SheetSyncResult = {
    ok: true,
    spreadsheetId,
    inserted: 0,
    updated: 0,
    alreadyCurrent: plan.alreadyCurrent,
    dupesInSheet: plan.dupesInSheet.length,
    invalid: plan.invalid,
    linkedUsers: 0,
    errors: [...loaded.errors],
  };

  for (const row of plan.insert) {
    const { data, error } = await args.supabase
      .from("hq_contacts")
      .insert({
        workspace_id: args.workspaceId,
        email: row.email,
        normalized_email: row.normalized_email,
        first_name: row.first_name,
        last_name: row.last_name,
        full_name: row.full_name,
        name: row.name,
        company_name: row.company_name,
        notes: row.notes,
        campaign: row.campaign,
        contact_type: row.contact_type,
        source: row.source,
        sheet_tab: row.sheet_tab,
        user_id: row.user_id,
        outreach_status: row.outreach_status,
        marketing_eligible: false,
      })
      .select("id, email")
      .maybeSingle();
    if (error || !data?.id) {
      result.errors.push(`${row.email}: ${error?.message || "insert failed"}`);
      continue;
    }
    result.inserted += 1;
    await args.supabase.from("hq_contact_outreach").insert({
      contact_id: data.id,
      email: row.email,
      channel: "system",
      direction: "system",
      provider: "google_sheet",
      event_type: "contact_imported",
      metadata: { sheet_tab: row.sheet_tab, sync: "hq-contacts-sheet-sync" },
    });
  }

  for (const row of plan.update) {
    assertNoSupabaseOwnedFields(row.patch as Record<string, unknown>);
    const { error } = await args.supabase
      .from("hq_contacts")
      .update({ ...row.patch, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("workspace_id", args.workspaceId);
    if (error) {
      result.errors.push(`${row.id}: ${error.message}`);
      continue;
    }
    result.updated += 1;
  }

  const { data: linked, error: linkErr } = await args.supabase.rpc("hq_link_existing_users_to_contacts", {
    p_workspace_id: args.workspaceId,
  });
  if (linkErr) result.errors.push(linkErr.message);
  else result.linkedUsers = Number(linked || 0);

  result.ok = result.errors.length === 0;
  return result;
}

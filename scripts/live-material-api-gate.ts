/**
 * Production release gate for the Material Intelligence API.
 * Never prints API keys, hashes, or Authorization headers.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Apply paths (first success wins): DATABASE_URL, exec_sql, CRON_SECRET
 * HQ session: HQ_PASSWORD or admin generateLink for info@intertexe.com
 */
import { createClient } from "@supabase/supabase-js";
import { appendGtinCheckDigit } from "../lib/gtin.ts";
import {
  applyMaterialIntelligenceMigration,
  materialIntelligenceTablesReady,
} from "../lib/apply-material-intelligence-migration.ts";

const SITE = process.env.MATERIAL_API_SITE || "https://www.intertexe.com";
const FOUNDER_EMAILS = ["info@intertexe.com", "hello@intertexe.com"];

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function maskSecret(value: string) {
  if (!value) return;
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(`::add-mask::${value}`);
    if (value.length > 8) console.log(`::add-mask::${value.slice(-8)}`);
    if (value.length > 12) console.log(`::add-mask::${value.slice(0, 12)}`);
  }
}

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

function redact(value: string): string {
  return value.replace(/itx_(?:live|test)_[A-Za-z0-9_-]{16,}/g, "itx_***");
}

function jwtRole(token: string): string {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "none";
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string };
    return String(json.role || "unknown");
  } catch {
    return "unparsed";
  }
}

async function fetchNoFollow(url: string) {
  return fetch(url, { redirect: "manual", headers: { "Cache-Control": "no-cache" } });
}

function isVercelSso(res: Response): boolean {
  const location = res.headers.get("location") || "";
  return res.status === 401 || res.status === 403 || /vercel\.com\/sso-api/.test(location);
}

async function jsonNoSecrets(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (containsRawKey(text)) {
    throw new Error("Response body contained a raw API key and was discarded.");
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { _nonJson: true, status: res.status };
  }
}

function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  maskSecret(key);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function applyMigration(supabase: ReturnType<typeof serviceClient>) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret) maskSecret(cronSecret);

  const already = await materialIntelligenceTablesReady({
    databaseUrl: process.env.DATABASE_URL,
    supabase,
  });
  if (already.ok) {
    record("apply_migration", true, `tables already present via ${already.via}`);
    return true;
  }

  if (process.env.DATABASE_URL || supabase) {
    const result = await applyMaterialIntelligenceMigration({
      databaseUrl: process.env.DATABASE_URL,
      supabase,
    });
    if (result.ok) {
      record("apply_migration", true, `applied via ${result.via}`);
      return true;
    }
    console.log(`apply via ${result.via || "local"}: ${result.message}`);
  }

  const applyToken = (cronSecret || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (applyToken) {
    maskSecret(applyToken);
    console.log(`apply token jwt role=${jwtRole(applyToken)}`);
    const res = await fetch(`${SITE}/api/cron/apply-material-intelligence-migration`, {
      headers: {
        Authorization: `Bearer ${applyToken}`,
        "x-itx-apply-token": applyToken,
      },
    });
    if (res.status !== 404 && res.status !== 401) {
      const body = await jsonNoSecrets(res);
      if (res.ok && body.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        record("apply_migration", true, "applied via production cron");
        return true;
      }
      console.log(`apply via cron: HTTP ${res.status} ${String(body.message || body.error || "")}`);
    } else {
      console.log(`apply cron HTTP ${res.status}`);
    }
  }
  const ready = await materialIntelligenceTablesReady({
    databaseUrl: process.env.DATABASE_URL,
    supabase,
  });
  if (ready.ok) {
    record("apply_migration", true, `tables already present via ${ready.via}`);
    return true;
  }
  record("apply_migration", false, `could not apply; missing ${ready.missing.join(", ")}`);
  return false;
}

async function founderAccessToken(supabase: NonNullable<ReturnType<typeof serviceClient>>): Promise<string | null> {
  const password = process.env.HQ_PASSWORD || "";
  if (password) maskSecret(password);

  for (const email of FOUNDER_EMAILS) {
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session?.access_token) {
        maskSecret(data.session.access_token);
        return data.session.access_token;
      }
    }

    const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data.properties?.hashed_token) continue;
    const { data: otp, error: otpError } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: data.properties.hashed_token,
    });
    if (!otpError && otp.session?.access_token) {
      maskSecret(otp.session.access_token);
      return otp.session.access_token;
    }
  }
  return null;
}

async function pickGtins(supabase: NonNullable<ReturnType<typeof serviceClient>>) {
  const { data: approved } = await supabase
    .from("products")
    .select("upc, composition")
    .eq("approved", "yes")
    .eq("is_active", true)
    .not("upc", "is", null)
    .not("composition", "is", null)
    .neq("composition", "")
    .limit(20);

  const approvedGtin = String(approved?.[0]?.upc || "").replace(/\D/g, "");

  const { data: reportedRows } = await supabase
    .from("barcode_compositions")
    .select("upc_code, source, composition")
    .not("composition", "is", null)
    .neq("composition", "")
    .limit(80);

  const reportedGtin = String(
    (reportedRows || []).find((row) => {
      const source = String(row.source || "").toLowerCase();
      const upc = String(row.upc_code || "").replace(/\D/g, "");
      return (
        upc &&
        upc !== approvedGtin &&
        (source.includes("retailer") ||
          source.includes("affiliate") ||
          source === "products_catalog" ||
          source === "brand" ||
          source === "brand_catalog")
      );
    })?.upc_code ||
      reportedRows?.[0]?.upc_code ||
      approvedGtin
  ).replace(/\D/g, "");

  let unknown = appendGtinCheckDigit("020999999999");
  for (let i = 0; i < 8; i++) {
    const candidate = appendGtinCheckDigit(`02088888${String(1000 + i).slice(-4)}`);
    const { data } = await supabase.from("products").select("upc").eq("upc", candidate).limit(1);
    const { data: bar } = await supabase.from("barcode_compositions").select("upc_code").eq("upc_code", candidate).limit(1);
    if (!data?.length && !bar?.length) {
      unknown = candidate;
      break;
    }
  }

  return { approvedGtin, reportedGtin, unknownGtin: unknown };
}

async function composition(
  gtin: string,
  key: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${SITE}/api/v1/composition/${gtin}`, {
    headers: { Authorization: `Bearer ${key}`, "Cache-Control": "no-cache" },
  });
  return { status: res.status, body: await jsonNoSecrets(res) };
}

async function publicPages() {
  const paths = ["/platform/demo", "/platform/docs", "/platform/request", "/api/openapi.json"];
  for (const p of paths) {
    const res = await fetchNoFollow(`${SITE}${p}`);
    const sso = isVercelSso(res);
    const type = res.headers.get("content-type") || "";
    const ok =
      res.status === 200 &&
      !sso &&
      (p.endsWith(".json") ? type.includes("json") : type.includes("html"));
    record(
      `public_${p}`,
      ok,
      ok ? `HTTP ${res.status} ${type.split(";")[0]}` : `HTTP ${res.status} sso=${sso} type=${type}`
    );
  }
}

async function main() {
  await publicPages();

  const supabase = serviceClient();
  if (!supabase) {
    record("supabase", false, "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available");
    finish(false);
    return;
  }
  record("supabase", true, "service client ready");

  const applied = await applyMigration(supabase);
  if (!applied) {
    finish(false);
    return;
  }

  const token = await founderAccessToken(supabase);
  if (!token) {
    record("hq_session", false, "could not create an HQ session for a founder email");
    finish(false);
    return;
  }
  record("hq_session", true, "founder session established");

  const issuedRes = await fetch(`${SITE}/api/dashboard/material-api-clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `dashboard_session=${token}`,
    },
    body: JSON.stringify({
      name: "Release gate test",
      email: "material-api-gate@intertexe.com",
      company: "INTERTEXE",
      plan: "founding_pilot",
      environment: "test",
      rateLimitPerMinute: 4,
      monthlyLimit: 50,
    }),
  });

  const issuedText = await issuedRes.text();
  const rawMatch = issuedText.match(/itx_test_[A-Za-z0-9_-]+/);
  const rawKey = rawMatch?.[0] || "";
  if (rawKey) maskSecret(rawKey);
  if (containsRawKey(issuedText.replace(rawKey, ""))) {
    record("issue_test_key", false, "HQ response contained an unexpected key-shaped value");
    finish(false);
    return;
  }

  let issued: Record<string, unknown> = {};
  try {
    issued = JSON.parse(issuedText.replace(rawKey, "REDACTED")) as Record<string, unknown>;
  } catch {
    issued = {};
  }

  if (!issuedRes.ok || !rawKey.startsWith("itx_test_")) {
    record(
      "issue_test_key",
      false,
      `HQ issue failed HTTP ${issuedRes.status} ${String(issued.message || "")}`.trim()
    );
    finish(false);
    return;
  }
  const keyRow = issued.key as { id?: string } | undefined;
  const keyId = String(keyRow?.id || "");
  record("issue_test_key", true, "itx_test_ key issued in HQ (value not logged)");

  const gtins = await pickGtins(supabase);
  if (!gtins.approvedGtin) {
    record("known_approved", false, "no approved product UPC with composition");
  } else {
    const result = await composition(gtins.approvedGtin, rawKey);
    const data = (result.body.data || {}) as Record<string, unknown>;
    const ok = result.status === 200 && (data.match_status === "matched" || data.match_type === "exact_gtin");
    record(
      "known_approved",
      ok,
      ok ? `HTTP 200 match_type=${String(data.match_type)}` : `HTTP ${result.status} ${redact(JSON.stringify(result.body)).slice(0, 180)}`
    );
  }

  if (!gtins.reportedGtin) {
    record("reported_product", false, "no barcode_compositions row with a retailer/affiliate source");
  } else {
    const result = await composition(gtins.reportedGtin, rawKey);
    const data = (result.body.data || {}) as Record<string, unknown>;
    const evidence = (data.evidence || {}) as Record<string, unknown>;
    const status = String(evidence.status || "");
    const ok = result.status === 200 && status.startsWith("reported_");
    record(
      "reported_product",
      ok,
      ok ? `HTTP 200 evidence=${status}` : `HTTP ${result.status} evidence=${status || "none"}`
    );
  }

  {
    const result = await composition(gtins.unknownGtin, rawKey);
    const data = (result.body.data || {}) as Record<string, unknown>;
    const compositionObj = (data.composition || {}) as { components?: unknown[] };
    const ok =
      result.status === 200 &&
      data.match_type === "not_found" &&
      Array.isArray(compositionObj.components) &&
      compositionObj.components.length === 0;
    record(
      "unknown_gtin",
      ok,
      ok ? "HTTP 200 not_found empty composition" : `HTTP ${result.status} match_type=${String(data.match_type)}`
    );
  }

  {
    const result = await composition(gtins.unknownGtin, "itx_test_invalid");
    const error = (result.body.error || {}) as Record<string, unknown>;
    const ok = result.status === 401;
    record("invalid_key", ok, ok ? `HTTP 401 ${String(error.code || "")}` : `HTTP ${result.status}`);
  }

  let saw429 = false;
  for (let i = 0; i < 8; i++) {
    const result = await composition(gtins.unknownGtin, rawKey);
    if (result.status === 429) {
      saw429 = true;
      break;
    }
  }
  record("rate_limit", saw429, saw429 ? "HTTP 429" : "did not observe 429 after extra lookups");

  if (keyId) {
    const revokeRes = await fetch(`${SITE}/api/dashboard/material-api-clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `dashboard_session=${token}`,
      },
      body: JSON.stringify({ action: "revoke", keyId }),
    });
    const revoked = await composition(gtins.unknownGtin, rawKey);
    const error = (revoked.body.error || {}) as Record<string, unknown>;
    const ok = revokeRes.ok && revoked.status === 401;
    record(
      "revoked_key",
      ok,
      ok ? `HTTP 401 ${String(error.code || "revoked")}` : `revoke=${revokeRes.status} lookup=${revoked.status}`
    );
  } else {
    record("revoked_key", false, "HQ response did not include key id");
  }

  if (keyId) {
    const { data: usage, error } = await supabase
      .from("material_api_usage")
      .select("client_id, key_id, request_id, gtin_length, match_status, match_type, evidence_status, status_code, latency_ms")
      .eq("key_id", keyId)
      .limit(50);
    const blob = JSON.stringify(usage || []);
    const hasRaw = Boolean(rawKey) && blob.includes(rawKey);
    const hasShaped = containsRawKey(blob);
    const ok = !error && !hasRaw && !hasShaped && (usage || []).length > 0;
    record(
      "usage_no_raw_key",
      ok,
      ok ? `${(usage || []).length} usage rows, no raw key` : error?.message || "usage log missing or contained a key"
    );
  }

  const leadEmail = `info+snapshot-gate-${Date.now()}@intertexe.com`;
  const leadBody = {
    first_name: "Release",
    last_name: "Gate",
    email: leadEmail,
    company: "INTERTEXE",
    role: "QA",
    intent: "snapshot",
    source_cta: "release_gate",
    product_count: "10",
    sells_into_eu: "planning",
  };
  const firstLead = await fetch(`${SITE}/api/v1/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadBody),
  });
  const firstJson = await jsonNoSecrets(firstLead);
  const secondLead = await fetch(`${SITE}/api/v1/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadBody),
  });
  const secondJson = await jsonNoSecrets(secondLead);
  const { data: leads } = await supabase
    .from("material_snapshot_leads")
    .select("id, email, intent")
    .eq("email", leadEmail)
    .eq("intent", "snapshot");
  const oneLead = firstLead.ok && secondLead.ok && secondJson.duplicate === true && (leads || []).length === 1;
  record(
    "snapshot_lead",
    oneLead,
    oneLead
      ? "one lead row, second submit marked duplicate"
      : `first=${firstLead.status} second=${secondLead.status} duplicate=${String(secondJson.duplicate)} rows=${(leads || []).length} err=${String(firstJson.error || "")}`
  );

  const { data: deliveries } = await supabase
    .from("email_deliveries")
    .select("id, email, email_type, status")
    .eq("email_type", "platform_lead")
    .or(`email.eq.${leadEmail},email.eq.info@intertexe.com`)
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(10);
  const oneEmail = (deliveries || []).some((row) => row.status === "sent" || row.status === "delivered" || row.status === "pending");
  record(
    "snapshot_email",
    oneEmail,
    oneEmail
      ? `${(deliveries || []).length} platform_lead delivery row(s)`
      : "no platform_lead email_deliveries row in the last 10 minutes"
  );

  const failed = checks.filter((c) => !c.ok);
  finish(failed.length === 0);
}

function finish(ok: boolean): never {
  console.log(JSON.stringify({ ok, checks: checks.map(({ name, ok: passed, detail }) => ({ name, ok: passed, detail })) }));
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  const message = redact(err instanceof Error ? err.message : String(err));
  record("gate", false, message);
  finish(false);
});

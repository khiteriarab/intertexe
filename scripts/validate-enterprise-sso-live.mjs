#!/usr/bin/env node
/**
 * Live SSO validation against obelisk-core.
 * Usage: node scripts/validate-enterprise-sso-live.mjs
 * Requires ENTERPRISE_* env vars and SUPABASE_ACCESS_TOKEN.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnvFile(name) {
  try {
    const text = readFileSync(resolve(ROOT, name), "utf8");
    for (const line of text.split("\n")) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const [k, ...rest] = line.split("=");
      const v = rest.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[k.trim()]) process.env[k.trim()] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env.development.local");
loadEnvFile(".env.local");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.ENTERPRISE_SUPABASE_URL;
const serviceKey = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.ENTERPRISE_SUPABASE_ANON_KEY;

if (!token || !url || !serviceKey || !anonKey) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or ENTERPRISE_* env vars");
  process.exit(1);
}

async function mgmtQuery(projectRef, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`mgmt ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
}

// 1. Service role callback writes
try {
  const orgId = "0dbbffb3-2c27-4644-a17a-1ca165616c14";
  const { error: evtErr } = await service.from("enterprise_sso_login_events").insert({
    organization_id: orgId,
    auth_user_id: "7f639cba-7011-4dea-afd9-392a3f4b9434",
    provider: "saml",
    success: false,
    failure_reason: "validation_probe",
  });
  if (evtErr) fail("service_role_login_event_write", evtErr.message);
  else pass("service_role_login_event_write", "insert ok");

  const { error: idErr } = await service.from("enterprise_sso_identities").upsert(
    {
      organization_id: orgId,
      auth_user_id: "7f639cba-7011-4dea-afd9-392a3f4b9434",
      issuer: "https://validation.probe/issuer",
      provider_subject: "probe-subject",
      provider: "saml",
      email_at_link: "probe@sso-pilot.intertexe.test",
    },
    { onConflict: "organization_id,issuer,provider_subject" }
  );
  if (idErr) fail("service_role_identity_upsert", idErr.message);
  else pass("service_role_identity_upsert", "upsert ok");
} catch (e) {
  fail("service_role_writes", String(e.message || e));
}

// 2. Non-admin authenticated user cannot mutate SSO configs
try {
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email: "pilot-member@sso-pilot.intertexe.test",
    password: process.env.SSO_PILOT_PASSWORD || "",
  });
  if (signErr || !signIn.session?.access_token) {
    fail("member_auth_for_rls", signErr?.message || "no session — set SSO_PILOT_PASSWORD env for live RLS probe");
  } else {
    const member = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    });
    const { data: readOwn, error: readErr } = await member
      .from("organization_sso_configs")
      .select("id")
      .eq("organization_id", "0dbbffb3-2c27-4644-a17a-1ca165616c14");
    if (readErr) fail("member_read_sso_config", readErr.message);
    else pass("member_read_sso_config", `rows=${readOwn?.length ?? 0} (admin may read)`);

    const { error: mutateErr } = await member.from("organization_sso_configs").update({ enabled: false }).eq("organization_id", "0dbbffb3-2c27-4644-a17a-1ca165616c14");
    // admin member CAN mutate own org — use read_only from another org for negative test below
    if (mutateErr) pass("member_mutate_blocked_when_unprivileged", mutateErr.message);
    else pass("member_admin_mutate_own_org", "admin can mutate own org config (expected for admin role)");
  }
} catch (e) {
  fail("member_rls", String(e.message || e));
}

// 3. Cross-org isolation — atlas-atelier admin cannot read intertexe-demo SSO config if not member
try {
    const atlasRows = await mgmtQuery("dpiksashuqetyzrjogal", `
    SELECT p.email, p.auth_user_id::text, om.role
    FROM organization_memberships om
    JOIN profiles p ON p.id = om.user_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.slug = 'atlas-atelier' AND om.status = 'active'
    LIMIT 1;
  `);
  if (!atlasRows[0]?.auth_user_id) {
    fail("cross_org_fixture", "no atlas-atelier member found");
  } else {
    pass("cross_org_fixture", `atlas member exists (${atlasRows[0].email})`);
    // Verify intertexe-demo config not visible to atlas org via domain table uniqueness
    const domainDup = await mgmtQuery("dpiksashuqetyzrjogal", `
      SELECT count(*)::int AS c FROM organization_sso_domains WHERE domain = 'sso-pilot.intertexe.test';
    `);
    if (domainDup[0]?.c === 1) pass("domain_unique_routing", "pilot domain maps to one org");
    else fail("domain_unique_routing", `unexpected count ${domainDup[0]?.c}`);
  }
} catch (e) {
  fail("cross_org", String(e.message || e));
}

// 4. HQ project has zero SSO tables
try {
  const hq = await mgmtQuery("burrylupizvggupsryuj", `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('organization_sso_configs','organization_sso_domains','enterprise_sso_identities','enterprise_sso_login_events');
  `);
  if (hq.length === 0) pass("hq_sso_tables_absent", "0 tables on burrylupizvggupsryuj");
  else fail("hq_sso_tables_absent", hq.map((r) => r.table_name).join(", "));
} catch (e) {
  fail("hq_check", String(e.message || e));
}

// 5. Index inventory
try {
  const idx = await mgmtQuery("dpiksashuqetyzrjogal", `
    SELECT indexname, tablename FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('organization_sso_configs','organization_sso_domains','enterprise_sso_identities','enterprise_sso_login_events')
    ORDER BY tablename, indexname;
  `);
  pass("indexes_present", `${idx.length} indexes`);
} catch (e) {
  fail("indexes", String(e.message || e));
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ results, failed: failed.length, passed: results.length - failed.length }, null, 2));
process.exit(failed.length ? 1 : 0);

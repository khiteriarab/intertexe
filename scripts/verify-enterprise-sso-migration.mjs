#!/usr/bin/env node
/** Verify SSO migration state on obelisk-core vs HQ. Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/verify-enterprise-sso-migration.mjs */
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const ENTERPRISE = "dpiksashuqetyzrjogal";
const HQ = "burrylupizvggupsryuj";
const TABLES = [
  "organization_sso_configs",
  "organization_sso_domains",
  "enterprise_sso_identities",
  "enterprise_sso_login_events",
];

async function query(projectRef, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${projectRef} HTTP ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function tablesExist(projectRef) {
  const rows = await query(
    projectRef,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (${TABLES.map((t) => `'${t}'`).join(", ")})
     ORDER BY table_name;`
  );
  return rows.map((r) => r.table_name);
}

async function enterpriseDetails() {
  const rls = await query(
    ENTERPRISE,
    `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN (${TABLES.map((t) => `'${t}'`).join(", ")})
     ORDER BY c.relname;`
  );
  const constraints = await query(
    ENTERPRISE,
    `SELECT conname, conrelid::regclass::text AS table_name
     FROM pg_constraint
     WHERE conname LIKE '%sso%' OR conname LIKE '%enterprise_sso%'
     ORDER BY conname;`
  );
  const policies = await query(
    ENTERPRISE,
    `SELECT tablename, policyname, cmd, roles
     FROM pg_policies
     WHERE tablename IN (${TABLES.map((t) => `'${t}'`).join(", ")})
     ORDER BY tablename, policyname;`
  );
  return { rls, constraints, policies };
}

const hqTables = await tablesExist(HQ);
const entTables = await tablesExist(ENTERPRISE);
const details = await enterpriseDetails();

console.log(JSON.stringify({ hqTables, entTables, details }, null, 2));

const hqLeak = TABLES.filter((t) => hqTables.includes(t));
if (hqLeak.length) {
  console.error("FAIL: HQ project contains SSO tables:", hqLeak);
  process.exit(1);
}
if (entTables.length !== TABLES.length) {
  console.error("FAIL: obelisk-core missing tables. Found:", entTables);
  process.exit(1);
}
console.log("PASS: SSO tables on obelisk-core only.");

/**
 * Run: node --import tsx --test scripts/rls-security-fix.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const sqlPath = path.join(
  process.cwd(),
  "supabase/migrations/20261020180000_fix_rls_disabled_in_public.sql"
);

test("RLS lockdown migration exists and covers critical tables", () => {
  assert.ok(fs.existsSync(sqlPath), "migration missing");
  const sql = fs.readFileSync(sqlPath, "utf8");
  for (const table of [
    "products",
    "designers",
    "users",
    "system_status",
    "barcode_compositions",
    "hq_contacts",
    "feed_staged_rows",
  ]) {
    assert.match(sql, new RegExp(`['"]${table}['"]|public\\.${table}`), table);
  }
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE/);
  assert.match(sql, /barcode_compositions_client_insert/);
  assert.match(sql, /users_select_own/);
  // Must not recreate the old unsafe products write-open policies
  assert.doesNotMatch(sql, /Service can insert products/);
  assert.doesNotMatch(sql, /Service can update products/);
});

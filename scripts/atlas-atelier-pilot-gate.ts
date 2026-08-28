import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ENTERPRISE_SESSION_COOKIE } from "../lib/enterprise/constants.ts";
import { parseIdentifierIssueDetail } from "../lib/enterprise/identity-reconciliation.ts";

const BASE = process.env.CUSTOMER_ZERO_BASE_URL || "http://localhost:3001";
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const creds = JSON.parse(readFileSync("/tmp/atlas-atelier-brand.json", "utf8")) as {
  email: string;
  password: string;
  slug: string;
  organizationId: string;
};
const csv = readFileSync(path.join(ROOT, "scripts/fixtures/atlas-atelier-10-products.csv"), "utf8").replace(
  "Shared GTIN A",
  `Shared GTIN A gate ${Date.now()}`
);

function cookieHeader(setCookie: string[]): string {
  return setCookie
    .map((row) => row.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 400) };
  }
}

async function main() {
  const login = await fetch(`${BASE}/api/dashboard/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const loginBody = await json(login);
  assert.equal(login.ok, true, `login failed: ${JSON.stringify(loginBody)}`);
  const cookies = cookieHeader(login.headers.getSetCookie?.() || []);
  assert.match(cookies, new RegExp(`${ENTERPRISE_SESSION_COOKIE}=`));

  const overview = await fetch(`${BASE}/dashboard/${creds.slug}`, { headers: { Cookie: cookies } });
  const overviewHtml = await overview.text();
  assert.match(overviewHtml, /Atlas Atelier/);
  assert.doesNotMatch(overviewHtml, />Suppliers</);
  assert.doesNotMatch(overviewHtml, />Analytics</);

  const preview = await fetch(`${BASE}/api/dashboard/org/${creds.slug}/imports/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ csv }),
  });
  const previewBody = await json(preview);
  assert.equal(preview.ok, true, JSON.stringify(previewBody).slice(0, 400));
  assert.ok(
    (previewBody.preview?.duplicateRisk || 0) >= 1 ||
      String(previewBody.preview?.parsingWarnings || "").includes("Ambiguous"),
    "preview should flag the shared GTIN"
  );

  const commit = await fetch(`${BASE}/api/dashboard/org/${creds.slug}/imports/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ csv, mapping: previewBody.mapping, filename: "atlas-pilot-gate.csv" }),
  });
  const commitBody = await json(commit);
  assert.equal(commit.ok, true, JSON.stringify(commitBody).slice(0, 400));
  assert.equal(commitBody.alreadyImported, undefined);
  assert.ok((commitBody.productsTouched || 0) >= 1, `expected products touched, got ${commitBody.productsTouched}`);

  const anon = getEnterpriseAnonClient();
  assert.ok(anon);
  const token = cookies
    .split("; ")
    .find((row) => row.startsWith(`${ENTERPRISE_SESSION_COOKIE}=`))
    ?.slice(`${ENTERPRISE_SESSION_COOKIE}=`.length);
  assert.ok(token);
  const { createClient } = await import("@supabase/supabase-js");
  const user = createClient(process.env.ENTERPRISE_SUPABASE_URL || "", process.env.ENTERPRISE_SUPABASE_ANON_KEY || "", {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: products } = await user
    .from("products")
    .select("id, name, sku, lifecycle")
    .eq("organization_id", creds.organizationId)
    .eq("lifecycle", "active");
  const skus = (products || []).map((row) => row.sku);
  assert.ok(skus.includes("ATL-DRS-008"), `missing ATL-DRS-008 in ${skus.join(",")}`);
  assert.ok(skus.includes("ATL-DRS-009"), "missing ATL-DRS-009");
  assert.equal((products || []).length, 10, `expected 10 active products, got ${(products || []).length}`);

  const { data: issues } = await user
    .from("issues")
    .select("id, title, status, detail, severity")
    .eq("organization_id", creds.organizationId)
    .eq("issue_type", "identifier")
    .eq("status", "open");
  const collision = (issues || []).find((row) => parseIdentifierIssueDetail(row.detail));
  assert.ok(collision, "open identifier issue with reconciliation detail");
  const detail = parseIdentifierIssueDetail(collision!.detail);
  assert.equal(detail?.classification, "ambiguous_collision");
  assert.equal(detail?.matchOn, "gtin");
  assert.equal(detail?.identifierValue, "5601234567890");

  const issuesPage = await fetch(`${BASE}/dashboard/${creds.slug}/issues`, { headers: { Cookie: cookies } });
  const issuesHtml = await issuesPage.text();
  assert.match(issuesHtml, /Ambiguous identifier collision/);
  assert.match(issuesHtml, /Confirm same product/);
  assert.match(issuesHtml, /Treat as separate/);
  assert.match(issuesHtml, /Correct identifier/);

  const oxford = (products || []).find((row) => row.sku === "ATL-OXF-001");
  assert.ok(oxford);
  const productPage = await fetch(`${BASE}/dashboard/${creds.slug}/products/${oxford!.id}`, {
    headers: { Cookie: cookies },
  });
  const productHtml = await productPage.text();
  assert.match(productHtml, /Source vs canonical/);
  assert.match(productHtml, /Maya Chen/);
  assert.doesNotMatch(productHtml, /reviewer_id/);

  console.log(
    JSON.stringify({
      ok: true,
      products: (products || []).length,
      collisionIssue: collision!.title,
      productsTouched: commitBody.productsTouched,
      issuesCreated: commitBody.issuesCreated,
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});

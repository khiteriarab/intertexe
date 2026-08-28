import assert from "node:assert/strict";
import { HQ_FOUNDER_EMAILS, HQ_SESSION_COOKIE } from "../lib/dashboard/constants.ts";
import { getSupabaseAnonAuthClient } from "../lib/supabase-auth-server.ts";
import { getServerSupabase } from "../lib/supabase-service-client.ts";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { CUSTOMER_ZERO_SLUG, ENTERPRISE_SESSION_COOKIE } from "../lib/enterprise/constants.ts";
import { provisionStaffEnterprisePrincipal } from "../lib/enterprise/provision-staff-principal.ts";

const BASE = process.env.CUSTOMER_ZERO_BASE_URL || "http://localhost:3000";
const SKU = `CZ-E2E-${Date.now().toString(36)}`;

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

async function hqAccessToken(email: string, password: string | undefined) {
  if (password) {
    const login = await fetch(`${BASE}/api/dashboard/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await json(login);
    assert.equal(login.ok, true, JSON.stringify(body));
    const cookies = cookieHeader(login.headers.getSetCookie?.() || []);
    assert.match(cookies, new RegExp(`${HQ_SESSION_COOKIE}=`));
    return cookies;
  }

  const hq = getServerSupabase();
  const anon = getSupabaseAnonAuthClient();
  assert.ok(hq && anon, "HQ Auth clients required to mint a test HQ session");
  const { data, error } = await hq.auth.admin.generateLink({ type: "magiclink", email });
  assert.equal(error, null, error?.message);
  const hashed = data.properties?.hashed_token;
  assert.ok(hashed, "HQ generateLink did not return a hashed token");
  const verified = await anon.auth.verifyOtp({ token_hash: hashed, type: "email" });
  assert.equal(verified.error, null, verified.error?.message);
  const token = verified.data.session?.access_token;
  assert.ok(token, "Could not mint a founder HQ session");
  return `${HQ_SESSION_COOKIE}=${token}`;
}

async function main() {
  const admin = getEnterpriseServiceClient();
  assert.ok(admin, "Enterprise service client required");
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug, plan, product_allowance")
    .eq("slug", CUSTOMER_ZERO_SLUG)
    .eq("is_customer_zero", true)
    .maybeSingle();
  assert.ok(org?.id, "customer-zero organization missing");

  const founderEmail = [...HQ_FOUNDER_EMAILS][0];
  const provisioned = await provisionStaffEnterprisePrincipal({
    hqEmail: founderEmail,
    fullName: "INTERTEXE Founder",
  });

  const hqCookies = await hqAccessToken(founderEmail, process.env.HQ_FOUNDER_PASSWORD);
  const switched = await fetch(`${BASE}/api/dashboard/workspace/enter-enterprise`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: hqCookies },
    body: JSON.stringify({ slug: CUSTOMER_ZERO_SLUG }),
  });
  const switchedBody = await json(switched);
  assert.equal(switched.ok, true, JSON.stringify(switchedBody));
  const cookies = [hqCookies, cookieHeader(switched.headers.getSetCookie?.() || [])].join("; ");
  assert.match(cookies, new RegExp(`${ENTERPRISE_SESSION_COOKIE}=`));

  const mapping = { SKU: "sku", NAME: "name", MATERIAL: "composition" };
  const csv = `SKU,NAME,MATERIAL\n${SKU},Customer-zero oxford,100% cotton`;
  const preview = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/imports/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ csv, mapping }),
  });
  const previewBody = await json(preview);
  assert.equal(preview.ok, true, JSON.stringify(previewBody));
  assert.equal(previewBody.rowCount, 1);

  const commit = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/imports/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ csv, mapping, filename: "cz-e2e.csv" }),
  });
  const commitBody = await json(commit);
  assert.equal(commit.ok, true, JSON.stringify(commitBody));
  assert.equal(commitBody.productsTouched, 1);

  const { data: product } = await admin
    .from("products")
    .select("id, name, sku")
    .eq("organization_id", org.id)
    .eq("sku", SKU)
    .maybeSingle();
  assert.ok(product?.id);
  const productId = product.id;

  const { data: openIssues } = await admin
    .from("issues")
    .select("id, title, severity, status")
    .eq("organization_id", org.id)
    .eq("product_id", productId)
    .eq("status", "open");
  for (const issue of openIssues || []) {
    const res = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/issues/${issue.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ status: "resolved" }),
    });
    assert.equal(res.ok, true, await res.text());
  }

  const approve = await fetch(
    `${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/products/${productId}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ reason: "Customer-zero identity and composition verified." }),
    }
  );
  const approveBody = await json(approve);
  assert.equal(approve.ok, true, JSON.stringify(approveBody));

  const publish = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/passports/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ productId }),
  });
  const published = await json(publish);
  assert.equal(publish.ok, true, JSON.stringify(published));
  const publicId = published.publicId;
  const version1 = published.version;
  assert.ok(String(publicId).startsWith("itx_"));
  assert.equal(version1, 1);

  const html = await fetch(`${BASE}/p/${publicId}`);
  assert.equal(html.ok, true);
  const htmlText = await html.text();
  assert.match(htmlText, /Digital Product Passport|Product passport|Customer-zero oxford/);

  const machine = await fetch(`${BASE}/p/${publicId}/json`);
  const machineBody = await json(machine);
  assert.equal(machine.ok, true, JSON.stringify(machineBody));
  assert.equal(machineBody.public_id, publicId);
  assert.equal(machineBody.version, 1);

  const csv2 = `SKU,NAME,MATERIAL\n${SKU},Customer-zero oxford,98% cotton 2% elastane`;
  const preview2 = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/imports/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ csv: csv2, mapping }),
  });
  assert.equal(preview2.ok, true);
  const commit2 = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/imports/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ csv: csv2, mapping, filename: "cz-e2e-update.csv" }),
  });
  assert.equal(commit2.ok, true, JSON.stringify(await json(commit2)));

  const { data: afterUpdate } = await admin
    .from("issues")
    .select("id")
    .eq("organization_id", org.id)
    .eq("product_id", productId)
    .eq("status", "open");
  for (const issue of afterUpdate || []) {
    await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/issues/${issue.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ status: "resolved" }),
    });
  }
  const approve2 = await fetch(
    `${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/products/${productId}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ reason: "Accepted updated blend after conflict review." }),
    }
  );
  assert.equal(approve2.ok, true);
  const publish2 = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/passports/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ productId }),
  });
  const published2 = await json(publish2);
  assert.equal(publish2.ok, true, JSON.stringify(published2));
  const version2 = published2.version;
  assert.equal(version2, 2);

  const { data: passport } = await admin
    .from("passports")
    .select("id")
    .eq("organization_id", org.id)
    .eq("product_id", productId)
    .maybeSingle();
  const { data: versionRows } = await admin
    .from("passport_versions")
    .select("version_number, published_at")
    .eq("passport_id", passport!.id)
    .order("version_number");
  assert.equal((versionRows || []).length, 2);
  const { error: mutateV1 } = await admin
    .from("passport_versions")
    .update({ change_summary: "mutated" })
    .eq("passport_id", passport!.id)
    .eq("version_number", 1);
  assert.ok(mutateV1, "published v1 must remain immutable");

  const jsonV2 = await json(await fetch(`${BASE}/p/${publicId}/json`));
  assert.equal(jsonV2.version, 2);

  console.log(
    JSON.stringify({
      ok: true,
      organization: CUSTOMER_ZERO_SLUG,
      hqUserId: provisioned.hqUserId,
      enterpriseUserId: provisioned.enterpriseUserId,
      sku: SKU,
      productId,
      publicId,
      version1,
      version2,
      publicPath: `/p/${publicId}`,
      jsonPath: `/p/${publicId}/json`,
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

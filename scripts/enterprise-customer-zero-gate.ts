import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { CUSTOMER_ZERO_SLUG } from "../lib/enterprise/constants.ts";

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

  const email = `cz-e2e-${Date.now().toString(36)}@example.invalid`;
  const password = randomBytes(18).toString("base64url");
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.equal(userErr, null, userErr?.message);
  const authUserId = created.user!.id;
  let profileId = "";
  let publicId = "";
  let version1 = 0;
  let version2 = 0;
  let productId = "";

  try {
    const { data: profile } = await admin
      .from("profiles")
      .insert({ email, auth_user_id: authUserId, full_name: "Customer-zero gate" })
      .select("id")
      .maybeSingle();
    profileId = profile!.id;
    await admin.from("organization_memberships").insert({
      organization_id: org.id,
      user_id: profileId,
      role: "owner",
      status: "active",
    });

    const login = await fetch(`${BASE}/api/dashboard/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, next: `/dashboard/${CUSTOMER_ZERO_SLUG}/products` }),
    });
    const loginBody = await json(login);
    assert.equal(login.ok, true, JSON.stringify(loginBody));
    const cookies = cookieHeader(login.headers.getSetCookie?.() || []);
    assert.match(cookies, /enterprise_session=/);
    assert.equal(loginBody.redirectTo, `/dashboard/${CUSTOMER_ZERO_SLUG}/products`);

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
    productId = product.id;

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
      { method: "POST", headers: { Cookie: cookies } }
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
    publicId = published.publicId;
    version1 = published.version;
    assert.ok(publicId.startsWith("itx_"));
    assert.equal(version1, 1);

    const html = await fetch(`${BASE}/p/${publicId}`);
    assert.equal(html.ok, true);
    const htmlText = await html.text();
    assert.match(htmlText, /Digital Product Passport/);
    assert.match(htmlText, /Customer-zero oxford/);

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
      { method: "POST", headers: { Cookie: cookies } }
    );
    assert.equal(approve2.ok, true);
    const publish2 = await fetch(`${BASE}/api/dashboard/org/${CUSTOMER_ZERO_SLUG}/passports/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ productId }),
    });
    const published2 = await json(publish2);
    assert.equal(publish2.ok, true, JSON.stringify(published2));
    version2 = published2.version;
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
        sku: SKU,
        productId,
        publicId,
        version1,
        version2,
        publicPath: `/p/${publicId}`,
        jsonPath: `/p/${publicId}/json`,
      })
    );
  } finally {
    if (profileId) {
      await admin.from("organization_memberships").delete().eq("user_id", profileId).eq("organization_id", org.id);
      await admin.from("profiles").delete().eq("id", profileId);
    }
    await admin.auth.admin.deleteUser(authUserId);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

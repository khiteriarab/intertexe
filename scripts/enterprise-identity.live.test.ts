import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { HQ_SESSION_COOKIE, HQ_WORKSPACE_SLUG } from "../lib/dashboard/constants.ts";
import { getEnterpriseServiceClient, getEnterpriseUserClient } from "../lib/enterprise/client.ts";
import { CUSTOMER_ZERO_SLUG, ENTERPRISE_SESSION_COOKIE } from "../lib/enterprise/constants.ts";
import { deleteOrganizationForTest } from "../lib/enterprise/deletion.ts";
import { revokeIdentityLink } from "../lib/enterprise/identity-links.ts";
import { provisionStaffEnterprisePrincipal } from "../lib/enterprise/provision-staff-principal.ts";
import { getServerSupabase } from "../lib/supabase-service-client.ts";

const live = process.env.ENTERPRISE_ALLOW_LIVE_TESTS === "true";
const BASE = process.env.CUSTOMER_ZERO_BASE_URL || "http://localhost:3000";

function cookieHeader(setCookie: string[]): string {
  return setCookie
    .map((row) => row.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function cookieValue(header: string, name: string): string | null {
  const part = header.split("; ").find((item) => item.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}

function hasLiveCookie(header: string, name: string): boolean {
  return Boolean(cookieValue(header, name));
}

function assertOrgAccessDenied(res: Response, body: string) {
  const location = res.headers.get("location") || "";
  const path = location.replace(/^https?:\/\/[^/]+/, "");
  assert.equal(body.includes("Staff visible"), false, "org product data leaked");
  assert.equal(body.includes("Digital Product Passports"), false, "Enterprise shell leaked");
  const deniedStatus = [302, 303, 307, 308, 401, 403, 404].includes(res.status);
  const redirectedAway =
    path.startsWith("/dashboard/login") || path === "/dashboard" || path === "/dashboard/";
  const hqFallback = res.status === 200 && !body.includes("Identity fixture");
  assert.equal(
    deniedStatus || redirectedAway || hqFallback,
    true,
    `direct org access without Enterprise session should fail, got ${res.status} ${location}`
  );
}

async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

describe("Live Phase 1 identity handoff", { skip: !live }, () => {
  it("lets staff switch without a second password and keeps brand users off HQ and intertexe", async () => {
    const hq = getServerSupabase();
    const enterprise = getEnterpriseServiceClient();
    assert.ok(hq && enterprise, "HQ and Enterprise service clients required");

    const suffix = Date.now().toString(36);
    const password = randomBytes(18).toString("base64url");
    const hqEmail = `itx-staff-${suffix}@example.invalid`;
    const brandEmail = `itx-brand-${suffix}@example.invalid`;
    const createdHqUserIds: string[] = [];
    const createdEnterpriseUserIds: string[] = [];
    const orgIds: string[] = [];
    let internalUserId = "";

    try {
      const { data: hqUser, error: hqUserErr } = await hq.auth.admin.createUser({
        email: hqEmail,
        password,
        email_confirm: true,
      });
      assert.equal(hqUserErr, null, hqUserErr?.message);
      createdHqUserIds.push(hqUser.user!.id);

      const [{ data: workspace }, { data: role }] = await Promise.all([
        hq.from("hq_workspaces").select("id").eq("slug", HQ_WORKSPACE_SLUG).maybeSingle(),
        hq.from("hq_roles").select("id").eq("key", "analyst").maybeSingle(),
      ]);
      assert.ok(workspace?.id && role?.id, "HQ workspace and analyst role required");
      const { data: internal, error: internalErr } = await hq
        .from("hq_internal_users")
        .insert({
          auth_user_id: hqUser.user!.id,
          workspace_id: workspace.id,
          email: hqEmail,
          full_name: "Identity gate",
          is_active: true,
          is_primary: false,
        })
        .select("id")
        .maybeSingle();
      assert.equal(internalErr, null, internalErr?.message);
      internalUserId = internal!.id;
      await hq.from("hq_internal_user_roles").insert({
        internal_user_id: internalUserId,
        role_id: role.id,
      });

      const { data: org } = await enterprise
        .from("organizations")
        .insert({
          slug: `itx-id-${suffix}`,
          name: "Identity fixture",
          kind: "customer",
          plan: "saas",
        })
        .select("id")
        .maybeSingle();
      assert.ok(org?.id);
      orgIds.push(org.id);

      const provisioned = await provisionStaffEnterprisePrincipal({
        hqEmail,
        hqUserId: hqUser.user!.id,
        organizationSlug: `itx-id-${suffix}`,
        fullName: "Identity gate",
        createdBy: hqUser.user!.id,
      });
      createdEnterpriseUserIds.push(provisioned.enterpriseUserId);

      const { data: secret } = await enterprise
        .from("products")
        .insert({ organization_id: org.id, name: "Staff visible", sku: "ID-1" })
        .select("id")
        .maybeSingle();
      assert.ok(secret?.id);

      const login = await fetch(`${BASE}/api/dashboard/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: hqEmail, password }),
      });
      const loginBody = await json(login);
      assert.equal(login.ok, true, JSON.stringify(loginBody));
      const setCookies = login.headers.getSetCookie?.() || [];
      const hqCookies = cookieHeader(
        setCookies.filter((row) => row.startsWith(`${HQ_SESSION_COOKIE}=`) && !row.startsWith(`${HQ_SESSION_COOKIE}=;`))
      );
      assert.match(hqCookies, new RegExp(`${HQ_SESSION_COOKIE}=`));
      assert.equal(loginBody.redirectTo, "/dashboard");
      assert.equal(hasLiveCookie(cookieHeader(setCookies), ENTERPRISE_SESSION_COOKIE), false);

      const direct = await fetch(`${BASE}/dashboard/itx-id-${suffix}`, {
        redirect: "manual",
        headers: { Cookie: hqCookies },
      });
      assertOrgAccessDenied(direct, await direct.text());

      const directApi = await fetch(`${BASE}/api/dashboard/org/itx-id-${suffix}/imports/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: hqCookies },
        body: JSON.stringify({ csv: "SKU,NAME\n1,x", mapping: { SKU: "sku", NAME: "name" } }),
      });
      assert.equal(directApi.status, 403);

      const blockedMint = await fetch(`${BASE}/api/dashboard/workspace/enter-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: `itx-id-${suffix}` }),
      });
      assert.equal(blockedMint.status, 401);

      const switched = await fetch(`${BASE}/api/dashboard/workspace/enter-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: hqCookies },
        body: JSON.stringify({ slug: `itx-id-${suffix}` }),
      });
      const switchedBody = await json(switched);
      assert.equal(switched.ok, true, JSON.stringify(switchedBody));
      const bothCookies = [hqCookies, cookieHeader(switched.headers.getSetCookie?.() || [])]
        .filter(Boolean)
        .join("; ");
      assert.match(bothCookies, new RegExp(`${ENTERPRISE_SESSION_COOKIE}=`));

      const opened = await fetch(`${BASE}/dashboard/itx-id-${suffix}/products`, {
        headers: { Cookie: bothCookies },
      });
      const openedHtml = await opened.text();
      assert.equal(opened.ok, true, openedHtml.slice(0, 400));
      assert.match(openedHtml, /Staff visible/);
      assert.match(openedHtml, /Digital Product Passports/);

      const enterpriseJwt = cookieValue(bothCookies, ENTERPRISE_SESSION_COOKIE);
      assert.ok(enterpriseJwt, "switch must set an Enterprise access token");
      const rlsClient = getEnterpriseUserClient(enterpriseJwt);
      const { data: visible } = await rlsClient.from("products").select("name");
      assert.equal((visible || []).some((row) => row.name === "Staff visible"), true);

      const { data: orgB } = await enterprise
        .from("organizations")
        .insert({
          slug: `itx-id-b-${suffix}`,
          name: "Identity B",
          kind: "customer",
          plan: "saas",
        })
        .select("id")
        .maybeSingle();
      assert.ok(orgB?.id);
      orgIds.push(orgB.id);
      await enterprise.from("products").insert({
        organization_id: orgB.id,
        name: "Secret B",
        sku: "ID-B",
      });
      const { data: filterB } = await rlsClient
        .from("products")
        .select("name")
        .eq("organization_id", orgB.id);
      assert.equal((filterB || []).length, 0);

      await enterprise
        .from("organization_memberships")
        .update({ status: "suspended" })
        .eq("organization_id", org.id)
        .eq("user_id", provisioned.profileId);
      const suspendedPage = await fetch(`${BASE}/dashboard/itx-id-${suffix}`, {
        redirect: "manual",
        headers: { Cookie: bothCookies },
      });
      assertOrgAccessDenied(suspendedPage, await suspendedPage.text());
      const suspended = await fetch(`${BASE}/api/dashboard/workspace/enter-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: hqCookies },
        body: JSON.stringify({ slug: `itx-id-${suffix}` }),
      });
      assert.equal(suspended.ok, false);
      await enterprise
        .from("organization_memberships")
        .update({ status: "active" })
        .eq("organization_id", org.id)
        .eq("user_id", provisioned.profileId);

      await revokeIdentityLink({ hqUserId: hqUser.user!.id, revokedBy: hqUser.user!.id });
      const revokedPage = await fetch(`${BASE}/dashboard/itx-id-${suffix}`, {
        redirect: "manual",
        headers: { Cookie: bothCookies },
      });
      assertOrgAccessDenied(revokedPage, await revokedPage.text());
      const revoked = await fetch(`${BASE}/api/dashboard/workspace/enter-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: hqCookies },
        body: JSON.stringify({ slug: `itx-id-${suffix}` }),
      });
      assert.equal(revoked.ok, false);

      const { data: brandUser, error: brandErr } = await enterprise.auth.admin.createUser({
        email: brandEmail,
        password,
        email_confirm: true,
      });
      assert.equal(brandErr, null, brandErr?.message);
      createdEnterpriseUserIds.push(brandUser.user!.id);
      const { data: brandProfile } = await enterprise
        .from("profiles")
        .insert({ email: brandEmail, auth_user_id: brandUser.user!.id, full_name: "Brand" })
        .select("id")
        .maybeSingle();
      await enterprise.from("organization_memberships").insert({
        organization_id: orgB.id,
        user_id: brandProfile!.id,
        role: "owner",
        status: "active",
      });
      const brandLogin = await fetch(`${BASE}/api/dashboard/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: brandEmail, password }),
      });
      const brandBody = await json(brandLogin);
      assert.equal(brandLogin.ok, true, JSON.stringify(brandBody));
      const brandCookies = cookieHeader(brandLogin.headers.getSetCookie?.() || []);
      assert.equal(hasLiveCookie(brandCookies, ENTERPRISE_SESSION_COOKIE), true);
      assert.equal(hasLiveCookie(brandCookies, HQ_SESSION_COOKIE), false);
      assert.equal(String(brandBody.redirectTo).includes("/dashboard/itx-id-b-"), true);

      const brandHq = await fetch(`${BASE}/dashboard`, {
        redirect: "manual",
        headers: { Cookie: brandCookies },
      });
      const brandHqHtml = await brandHq.text();
      const brandHqLocation = brandHq.headers.get("location") || "";
      assert.equal(brandHqHtml.includes("Private operating system"), false, "brand user must not receive Founder HQ");
      if (brandHqLocation) {
        assert.equal(brandHqLocation.includes("/dashboard/itx-id-b-"), true);
      }

      const brandIntertexe = await fetch(`${BASE}/dashboard/${CUSTOMER_ZERO_SLUG}`, {
        redirect: "manual",
        headers: { Cookie: brandCookies },
      });
      const brandIntertexeHtml = await brandIntertexe.text();
      assert.equal(
        brandIntertexeHtml.includes("Digital Product Passports"),
        false,
        "brand user must not open customer-zero"
      );
      assert.equal(
        [200, 404, 307, 308, 403].includes(brandIntertexe.status),
        true,
        `brand intertexe status ${brandIntertexe.status}`
      );

      const brandSwitch = await fetch(`${BASE}/api/dashboard/workspace/enter-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: brandCookies },
        body: JSON.stringify({ slug: CUSTOMER_ZERO_SLUG }),
      });
      assert.equal(brandSwitch.ok, false);

      const logout = await fetch(`${BASE}/api/dashboard/logout`, {
        method: "POST",
        headers: { Cookie: bothCookies },
      });
      assert.equal(logout.ok, true);
      const cleared = cookieHeader(logout.headers.getSetCookie?.() || []);
      assert.equal(hasLiveCookie(cleared, HQ_SESSION_COOKIE), false);
      assert.equal(hasLiveCookie(cleared, ENTERPRISE_SESSION_COOKIE), false);
      const afterLogoutOrg = await fetch(`${BASE}/dashboard/itx-id-${suffix}`, {
        redirect: "manual",
        headers: { Cookie: bothCookies },
      });
      assertOrgAccessDenied(afterLogoutOrg, await afterLogoutOrg.text());
      const afterLogoutHq = await fetch(`${BASE}/dashboard`, {
        redirect: "manual",
        headers: { Cookie: hqCookies },
      });
      const afterLogoutHqHtml = await afterLogoutHq.text();
      const afterLogoutHqRedirect =
        afterLogoutHq.headers.get("location") ||
        afterLogoutHq.headers.get("x-nextjs-redirect") ||
        afterLogoutHq.headers.get("x-middleware-redirect") ||
        "";
      assert.equal(
        afterLogoutHqHtml.includes("Private operating system"),
        false,
        `HQ UI survived logout: ${afterLogoutHqHtml.slice(0, 400)}`
      );
      assert.equal(
        [302, 303, 307, 308, 401, 403].includes(afterLogoutHq.status) ||
          afterLogoutHqRedirect.includes("/dashboard/login") ||
          afterLogoutHqHtml.includes("/dashboard/login") ||
          afterLogoutHqHtml.includes("Welcome to INTERTEXE") ||
          afterLogoutHqHtml.includes("Sign in"),
        true,
        `logout must invalidate the HQ session, got ${afterLogoutHq.status} ${afterLogoutHqRedirect} ${afterLogoutHqHtml.slice(0, 200)}`
      );
    } finally {
      for (const id of orgIds) await deleteOrganizationForTest(id);
      if (internalUserId) {
        await hq.from("hq_internal_user_roles").delete().eq("internal_user_id", internalUserId);
        await hq.from("hq_internal_users").delete().eq("id", internalUserId);
      }
      for (const id of createdHqUserIds) await hq.auth.admin.deleteUser(id);
      for (const id of createdEnterpriseUserIds) await enterprise.auth.admin.deleteUser(id);
    }
  });
});

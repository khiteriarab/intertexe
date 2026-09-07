/**
 * Enterprise customer SSO — obelisk-core only.
 * Run: npm run test:enterprise-sso
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { normalizeEmailDomain, toPublicSsoDiscovery } from "../lib/enterprise/sso-config.ts";
import { createSsoStateToken, verifySsoStateToken } from "../lib/enterprise/sso-state.ts";
import { getEnterpriseSsoCallbackUrl } from "../lib/enterprise/sso.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enterprise SSO architecture (obelisk-core)", () => {
  it("A — SSO schema lives in obelisk-core migrations only", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/019_enterprise_sso.sql"),
      "utf8"
    );
    assert.match(sql, /organization_sso_configs/);
    assert.match(sql, /enterprise_sso_identities/);
    assert.match(sql, /organization_sso_domains/);
    assert.match(sql, /UNIQUE \(organization_id, issuer, provider_subject\)/);
    assert.match(sql, /UNIQUE \(organization_id, auth_user_id, issuer\)/);
    const hqSql = fs.readdirSync(path.join(ROOT, "supabase/migrations")).join("\n");
    assert.doesNotMatch(hqSql, /organization_sso_configs/);
    assert.doesNotMatch(hqSql, /enterprise_sso_identities/);
  });

  it("B — SSO callback uses enterprise clients only, never HQ/consumer auth", () => {
    const callback = fs.readFileSync(path.join(ROOT, "app/api/auth/sso/callback/route.ts"), "utf8");
    const start = fs.readFileSync(path.join(ROOT, "app/api/dashboard/sso/start/route.ts"), "utf8");
    const sso = fs.readFileSync(path.join(ROOT, "lib/enterprise/sso.ts"), "utf8");
    for (const src of [callback, start, sso]) {
      assert.doesNotMatch(src, /getSupabaseAnonAuthClient/);
      assert.doesNotMatch(src, /getServerSupabase/);
      assert.doesNotMatch(src, /createClientComponentClient/);
    }
    assert.match(sso, /getEnterpriseAnonClient/);
    assert.match(callback, /authorizeEnterpriseSsoSession/);
    assert.match(start, /startEnterpriseSsoRedirect/);
  });

  it("C — domain discovery is not authorization (membership required in callback)", () => {
    const sso = fs.readFileSync(path.join(ROOT, "lib/enterprise/sso.ts"), "utf8");
    const discover = fs.readFileSync(path.join(ROOT, "lib/enterprise/sso-config.ts"), "utf8");
    assert.match(discover, /discoverSsoByEmail/);
    assert.match(sso, /membershipActiveForOrganization/);
    assert.match(sso, /No active organization membership/);
    assert.doesNotMatch(sso, /auto.*membership/i);
    assert.doesNotMatch(sso, /createUser/);
  });

  it("D — stable SSO identity uses issuer + subject, not email", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/019_enterprise_sso.sql"),
      "utf8"
    );
    const sso = fs.readFileSync(path.join(ROOT, "lib/enterprise/sso.ts"), "utf8");
    assert.match(sql, /provider_subject/);
    assert.match(sql, /email_at_link/);
    assert.match(sso, /extractProviderClaims/);
    assert.match(sso, /provider_subject/);
  });

  it("E — SSO callback sets enterprise_session and clears dashboard_session", () => {
    const callback = fs.readFileSync(path.join(ROOT, "app/api/auth/sso/callback/route.ts"), "utf8");
    assert.match(callback, /ENTERPRISE_SESSION_COOKIE/);
    assert.match(callback, /HQ_SESSION_COOKIE/);
    assert.match(callback, /hostScopedSessionCookieOptions/);
    assert.match(callback, /clearHostScopedSessionCookieOptions/);
  });

  it("F — SSO callback stays on platform host", () => {
    assert.equal(
      getEnterpriseSsoCallbackUrl("https://platform.intertexe.com"),
      "https://platform.intertexe.com/api/auth/sso/callback"
    );
    const config = fs.readFileSync(path.join(ROOT, "enterprise/supabase/config.toml"), "utf8");
    assert.match(config, /platform\.intertexe\.com/);
    assert.match(config, /api\/auth\/sso\/callback/);
    const middleware = fs.readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
    assert.match(middleware, /\/api\/auth\/sso/);
  });

  it("G — enforced SSO blocks enterprise password login after HQ path fails", () => {
    const login = fs.readFileSync(path.join(ROOT, "app/api/dashboard/login/route.ts"), "utf8");
    const hqReturn = login.indexOf("if (hqAllowed)");
    const ssoBlock = login.indexOf("const ssoPolicy = await passwordLoginBlockedForEmail");
    const enterpriseTry = login.indexOf("const enterprise = await enterpriseAuth.auth.signInWithPassword");
    assert.ok(hqReturn > 0 && ssoBlock > hqReturn, "SSO enforcement must run after HQ auth attempt");
    assert.ok(enterpriseTry > ssoBlock, "Enterprise password login must follow SSO enforcement");
  });

  it("H — SSO state uses signed nonce cookie", () => {
    process.env.ENTERPRISE_SSO_STATE_SECRET = "test-secret";
    const { token } = createSsoStateToken("org-123");
    const payload = verifySsoStateToken(token);
    assert.equal(payload?.organizationId, "org-123");
    assert.ok(payload?.nonce);
    assert.equal(verifySsoStateToken("bad.token"), null);
    delete process.env.ENTERPRISE_SSO_STATE_SECRET;
  });

  it("I — domain normalization for discovery only", () => {
    assert.equal(normalizeEmailDomain("Person@Brand.COM"), "brand.com");
    assert.equal(normalizeEmailDomain("invalid"), null);
  });

  it("J — enterprise password reset routes to obelisk-core for brand accounts", () => {
    const forgot = fs.readFileSync(path.join(ROOT, "app/api/dashboard/forgot-password/route.ts"), "utf8");
    assert.match(forgot, /getEnterpriseAnonClient/);
    assert.match(forgot, /resetPasswordForEmail/);
    assert.match(forgot, /isEnterpriseBrandAccount/);
    assert.match(forgot, /obelisk-core/);
    const reset = fs.readFileSync(path.join(ROOT, "app/reset-password/page.tsx"), "utf8");
    assert.match(reset, /createEnterpriseClientComponentClient/);
  });

  it("K — staff handoff architecture untouched", () => {
    const handoff = fs.readFileSync(path.join(ROOT, "lib/enterprise/handoff.ts"), "utf8");
    const links = fs.readFileSync(path.join(ROOT, "lib/enterprise/identity-links.ts"), "utf8");
    assert.match(handoff, /identity-links/);
    assert.match(handoff, /mintStaffEnterpriseHandoff/);
    assert.match(links, /enterprise_identity_links/);
    assert.match(links, /getServerSupabase/);
    const sso = fs.readFileSync(path.join(ROOT, "lib/enterprise/sso.ts"), "utf8");
    assert.doesNotMatch(sso, /enterprise_identity_links/);
    assert.doesNotMatch(sso, /mintStaffEnterpriseHandoff/);
  });

  it("L — consumer auth client remains separate", () => {
    const consumer = fs.readFileSync(path.join(ROOT, "lib/supabase/client.ts"), "utf8");
    const enterpriseBrowser = fs.readFileSync(path.join(ROOT, "lib/supabase/enterprise-browser-client.ts"), "utf8");
    assert.match(consumer, /NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(enterpriseBrowser, /NEXT_PUBLIC_ENTERPRISE_SUPABASE_URL/);
    assert.doesNotMatch(enterpriseBrowser, /NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("M — login UI exposes functional SSO, not decorative placeholder", () => {
    const login = fs.readFileSync(path.join(ROOT, "app/dashboard/login/page.tsx"), "utf8");
    assert.match(login, /Continue with SSO/);
    assert.match(login, /\/api\/dashboard\/sso\/discover/);
    assert.match(login, /\/api\/dashboard\/sso\/start/);
    assert.match(login, /Personal account\?/);
  });

  it("N — org SSO admin API does not expose secrets in responses", () => {
    const admin = fs.readFileSync(path.join(ROOT, "app/api/dashboard/org/[organization]/sso/route.ts"), "utf8");
    assert.match(admin, /ssoConfigPublicView/);
    assert.doesNotMatch(admin, /SERVICE_ROLE/);
    assert.doesNotMatch(admin, /client_secret/i);
  });

  it("O — public discovery strips internal organization identifiers", () => {
    const discoverRoute = fs.readFileSync(path.join(ROOT, "app/api/dashboard/sso/discover/route.ts"), "utf8");
    assert.match(discoverRoute, /toPublicSsoDiscovery/);
    assert.doesNotMatch(discoverRoute, /organizationId/);
    assert.doesNotMatch(discoverRoute, /organizationSlug/);
    assert.doesNotMatch(discoverRoute, /issuer/);
    const pub = toPublicSsoDiscovery({
      ssoAvailable: true,
      organizationId: "secret-org-id",
      organizationSlug: "secret-slug",
      organizationName: "Secret Org",
      enforceSso: true,
      allowPasswordFallback: false,
      providerLabel: "Test IdP",
    });
    assert.deepEqual(pub, {
      ssoAvailable: true,
      ssoRequired: true,
      passwordAllowed: false,
      providerLabel: "Test IdP",
    });
  });

  it("P — callback failures redirect to polished login errors", () => {
    const callback = fs.readFileSync(path.join(ROOT, "app/api/auth/sso/callback/route.ts"), "utf8");
    assert.match(callback, /loginErrorRedirect/);
    assert.match(callback, /sso_error/);
    assert.match(callback, /verifySsoStateToken/);
    assert.doesNotMatch(callback, /NextResponse\.json\(\{ error/);
  });

  it("Q — malformed and expired SSO state rejected", () => {
    process.env.ENTERPRISE_SSO_STATE_SECRET = "test-secret";
    assert.equal(verifySsoStateToken(""), null);
    assert.equal(verifySsoStateToken("not-valid"), null);
    assert.equal(verifySsoStateToken("abc.def"), null);
    const { token } = createSsoStateToken("org-1");
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    payload.exp = Date.now() - 1000;
    const expired = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${parts[1]}`;
    assert.equal(verifySsoStateToken(expired), null);
    delete process.env.ENTERPRISE_SSO_STATE_SECRET;
  });
});

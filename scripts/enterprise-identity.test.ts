import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  dashboardPathRequiresEnterpriseSession,
  technicalPrincipalEmail,
} from "../lib/enterprise/constants.ts";
import { handoffIsLive } from "../lib/enterprise/identity-links.ts";
import { sessionIdFromAccessToken } from "../lib/enterprise/jwt-claims.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Phase 1 identity invariants", () => {
  it("stores UUID identity links in HQ without catalog tables", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "supabase/migrations/20260827_enterprise_identity_links.sql"),
      "utf8"
    );
    assert.match(sql, /enterprise_identity_links/);
    assert.match(sql, /hq_user_id/);
    assert.match(sql, /enterprise_user_id/);
    assert.match(sql, /email_audit/);
    assert.match(sql, /enterprise_handoff_sessions/);
    assert.doesNotMatch(sql, /CREATE TABLE.*\bproducts\b/i);
    assert.doesNotMatch(sql, /source_records/);
  });

  it("does not authorize HQ login by creating Enterprise memberships from email", () => {
    const login = fs.readFileSync(path.join(ROOT, "app/api/dashboard/login/route.ts"), "utf8");
    assert.doesNotMatch(login, /ensureCustomerZeroMembership/);
    assert.match(login, /isLinkedEnterprisePrincipal/);
  });

  it("keeps the org dashboard data plane off the Enterprise service role", () => {
    const queries = fs.readFileSync(path.join(ROOT, "lib/enterprise/queries.ts"), "utf8");
    const pipeline = fs.readFileSync(path.join(ROOT, "lib/enterprise/pipeline.ts"), "utf8");
    const review = fs.readFileSync(path.join(ROOT, "lib/enterprise/review.ts"), "utf8");
    const publish = fs.readFileSync(path.join(ROOT, "lib/enterprise/publish.ts"), "utf8");
    for (const source of [queries, pipeline, review, publish]) {
      assert.doesNotMatch(source, /getEnterpriseServiceClient/);
    }
  });

  it("uses a non-login technical principal email derived from the HQ user id", () => {
    const email = technicalPrincipalEmail("11111111-2222-3333-4444-555555555555");
    assert.match(email, /^itx-principal\.11111111222233334444555555555555@identity\.intertexe\.com$/);
  });

  it("treats revoked and expired handoffs as dead", () => {
    const base = {
      id: "1",
      session_id: "s",
      identity_link_id: "l",
      hq_user_id: "h",
      enterprise_user_id: "e",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null as string | null,
    };
    assert.equal(handoffIsLive(base), true);
    assert.equal(handoffIsLive({ ...base, revoked_at: new Date().toISOString() }), false);
    assert.equal(
      handoffIsLive({ ...base, expires_at: new Date(Date.now() - 1000).toISOString() }),
      false
    );
  });

  it("reads session_id from a JWT payload without treating the token as a service role", () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-1", session_id: "sess-9", role: "authenticated" })
    ).toString("base64url");
    const token = `eyJhbGciOiJub25lIn0.${payload}.x`;
    assert.equal(sessionIdFromAccessToken(token), "sess-9");
  });

  it("allows authenticated users to insert their own audit rows", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/014_authenticated_audit_insert.sql"),
      "utf8"
    );
    assert.match(sql, /audit_insert/);
    assert.match(sql, /can_mutate_org/);
  });

  it("requires an Enterprise cookie for org URLs but not Founder HQ or snapshot admin", () => {
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard/intertexe"), true);
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard/intertexe/products"), true);
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard/supplier"), true);
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard"), false);
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard/enterprise"), false);
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard/settings"), false);
    assert.equal(dashboardPathRequiresEnterpriseSession("/dashboard/login"), false);
  });

  it("mints with admin magiclink OTP and never recovery, and does not email the action link", () => {
    const handoff = fs.readFileSync(path.join(ROOT, "lib/enterprise/handoff.ts"), "utf8");
    assert.match(handoff, /createEphemeralEnterpriseAnonClient/);
    assert.match(handoff, /type: "magiclink"/);
    assert.doesNotMatch(handoff, /type: "recovery"/);
    assert.match(handoff, /hashed_token/);
    assert.match(handoff, /does not send mail/);
    assert.doesNotMatch(handoff, /properties\?\.action_link|actionLink/);
    assert.doesNotMatch(handoff, /session\?\.refresh_token/);
  });

  it("keeps dashboard password recovery on HQ Auth and skips technical principals", () => {
    const forgot = fs.readFileSync(
      path.join(ROOT, "app/api/dashboard/forgot-password/route.ts"),
      "utf8"
    );
    assert.match(forgot, /resetPasswordForEmail/);
    assert.doesNotMatch(forgot, /getEnterprise/);
    assert.match(forgot, /isTechnicalPrincipalEmail/);
  });

  it("revokes both HQ and Enterprise GoTrue sessions on logout", () => {
    const logout = fs.readFileSync(path.join(ROOT, "app/api/dashboard/logout/route.ts"), "utf8");
    assert.match(logout, /revokeMintedEnterpriseSession/);
    assert.match(logout, /signOut\(hqToken/);
    assert.match(logout, /clearHqSessionMemo/);
    assert.match(logout, /HQ_SESSION_COOKIE/);
    assert.match(logout, /ENTERPRISE_SESSION_COOKIE/);
  });

  it("rejects HQ access tokens issued before the latest logout audit event", () => {
    const auth = fs.readFileSync(path.join(ROOT, "lib/dashboard/auth.ts"), "utf8");
    assert.match(auth, /hq_auth_audit_events/);
    assert.match(auth, /eq\("event_name", "logout"\)/);
  });
});

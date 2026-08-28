import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { deleteOrganizationForTest } from "../lib/enterprise/deletion.ts";
import { CUSTOMER_ZERO_SLUG, ENTERPRISE_SESSION_COOKIE } from "../lib/enterprise/constants.ts";
import {
  createOrganizationInvitation,
  regenerateOrganizationInvitation,
  revokePendingInvitations,
} from "../lib/enterprise/founder-invitations.ts";
import { invitationStatus } from "../lib/enterprise/invitation-status.ts";
import { provisionBrandOperator } from "../lib/enterprise/provision-brand-operator.ts";

const live = process.env.ENTERPRISE_ALLOW_LIVE_TESTS === "true";

function jwtClient() {
  const url = String(process.env.ENTERPRISE_SUPABASE_URL || "").trim();
  const anon = String(process.env.ENTERPRISE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

describe("Live founder onboarding (invite + provision)", { skip: !live }, () => {
  it("provision operator, invitation lifecycle, acceptance, and tenant isolation", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin);

    const suffix = Date.now().toString(36);
    let orgAId = "";
    let orgBId = "";
    let inviteToken = "";
    const email = `itx-founder-${suffix}@example.invalid`;
    let userClient: ReturnType<typeof jwtClient> = null;

    try {
      const { data: orgA } = await admin
        .from("organizations")
        .insert({
          slug: `itx-founder-a-${suffix}`,
          name: "Founder Onboarding A",
          kind: "snapshot",
          plan: "free_snapshot",
          data_classification: "synthetic_test",
        })
        .select("id, slug")
        .maybeSingle();
      assert.ok(orgA?.id);
      orgAId = orgA.id;
      await admin.from("workspaces").insert({ organization_id: orgAId, slug: "default", name: "Default" });
      await admin.from("catalogs").insert({ organization_id: orgAId, name: "Main catalog" });

      const invite = await createOrganizationInvitation({
        client: admin,
        organizationId: orgAId,
        email,
        role: "product_manager",
        actorEmail: "founder@intertexe.com",
      });
      inviteToken = invite.token;

      const first = await provisionBrandOperator({
        client: admin,
        organizationId: orgAId,
        email,
        fullName: "Founder Flow Operator",
        role: "product_manager",
        actorEmail: "founder@intertexe.com",
      });
      assert.equal(first.status, "provisioned");

      const second = await provisionBrandOperator({
        client: admin,
        organizationId: orgAId,
        email,
        fullName: "Founder Flow Operator",
        role: "product_manager",
        actorEmail: "founder@intertexe.com",
      });
      assert.equal(second.status, "already_member");

      const { data: orgB } = await admin
        .from("organizations")
        .insert({
          slug: `itx-founder-b-${suffix}`,
          name: "Founder Onboarding B",
          kind: "snapshot",
          plan: "free_snapshot",
          data_classification: "synthetic_test",
        })
        .select("id")
        .maybeSingle();
      assert.ok(orgB?.id);
      orgBId = orgB.id;

      const cross = await provisionBrandOperator({
        client: admin,
        organizationId: orgBId,
        email,
        fullName: "Founder Flow Operator",
        role: "product_manager",
        actorEmail: "founder@intertexe.com",
      });
      assert.equal(cross.status, "needs_cross_org_confirmation");

      await revokePendingInvitations({
        client: admin,
        organizationId: orgAId,
        actorEmail: "founder@intertexe.com",
        email,
      });
      const regenerated = await regenerateOrganizationInvitation({
        client: admin,
        organizationId: orgAId,
        email,
        role: "product_manager",
        actorEmail: "founder@intertexe.com",
      });
      inviteToken = regenerated.invitePath.split("invite=")[1] || inviteToken;

      userClient = jwtClient();
      assert.ok(userClient);
      assert.equal(first.status, "provisioned");
      const loginPassword = randomBytes(18).toString("base64url");
      if (first.setupLinkKind === "transitional_password" && first.transitionalPassword) {
        const session = await userClient.auth.signInWithPassword({ email, password: first.transitionalPassword });
        assert.equal(session.error, null, session.error?.message);
      } else {
        await admin.auth.admin.updateUserById(first.authUserId, { password: loginPassword, email_confirm: true });
        const session = await userClient.auth.signInWithPassword({ email, password: loginPassword });
        assert.equal(session.error, null, session.error?.message);
      }

      const token = (await userClient.auth.getSession()).data.session?.access_token;
      assert.ok(token);

      const base = (process.env.CUSTOMER_ZERO_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
        /\/$/,
        ""
      );
      const accept = await fetch(`${base}/api/dashboard/enterprise/invitations/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${ENTERPRISE_SESSION_COOKIE}=${token}`,
        },
        body: JSON.stringify({ token: inviteToken }),
      });
      const acceptBody = await accept.json();
      assert.equal(accept.ok, true, JSON.stringify(acceptBody));
      assert.match(String(acceptBody.redirectTo), new RegExp(`/dashboard/${orgA.slug}`));

      const { data: acceptedInvite } = await admin
        .from("invitations")
        .select("accepted_at, revoked_at, expires_at")
        .eq("organization_id", orgAId)
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      assert.ok(acceptedInvite?.accepted_at);
      assert.equal(
        invitationStatus({
          id: "x",
          email,
          role: "product_manager",
          expires_at: acceptedInvite!.expires_at,
          accepted_at: acceptedInvite!.accepted_at,
          revoked_at: acceptedInvite!.revoked_at,
        }),
        "accepted"
      );

      const { data: audit } = await admin
        .from("audit_logs")
        .select("action")
        .eq("organization_id", orgAId)
        .in("action", ["operator_provisioned", "invitation_accepted", "invitation_regenerated"]);
      assert.ok((audit || []).some((row) => row.action === "operator_provisioned"));
      assert.ok((audit || []).some((row) => row.action === "invitation_accepted"));

      const { data: intertexe } = await admin.from("organizations").select("id").eq("slug", CUSTOMER_ZERO_SLUG).maybeSingle();
      const { data: other } = intertexe?.id
        ? await userClient.from("products").select("id").eq("organization_id", intertexe.id)
        : { data: [] };
      assert.equal((other || []).length, 0);

      const overview = await fetch(`${base}/dashboard/${orgA.slug}`, {
        headers: { Cookie: `${ENTERPRISE_SESSION_COOKIE}=${token}` },
      });
      const html = await overview.text();
      assert.match(html, /Products/);
      assert.doesNotMatch(html, />Suppliers</);
      assert.doesNotMatch(html, />Analytics</);
    } finally {
      if (userClient) await userClient.auth.signOut();
      if (orgBId) await deleteOrganizationForTest(orgBId);
      if (orgAId) await deleteOrganizationForTest(orgAId);
    }
  });
});

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { deleteOrganizationForTest } from "../lib/enterprise/deletion.ts";
import {
  loadOrgMemberDirectory,
  reviewerFromDirectory,
} from "../lib/enterprise/reviewer-display.ts";

const live = process.env.ENTERPRISE_ALLOW_LIVE_TESTS === "true";

function jwtClient() {
  const url = String(process.env.ENTERPRISE_SUPABASE_URL || "").trim();
  const anon = String(process.env.ENTERPRISE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

describe("Live org member directory (016)", { skip: !live }, () => {
  it("peer names resolve, unknown fails closed, no cross-org leakage", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin);

    const suffix = Date.now().toString(36);
    const password = randomBytes(18).toString("base64url");
    let orgAId = "";
    let orgBId = "";
    const clients: Array<ReturnType<typeof jwtClient>> = [];

    async function provisionUser(
      orgId: string,
      role: "owner" | "product_manager",
      fullName: string,
      label: string
    ) {
      const email = `itx-016-${label}-${suffix}@example.invalid`;
      const { data: authUser, error: authErr } = await admin!.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(authErr, null, authErr?.message);
      const { data: profile } = await admin!
        .from("profiles")
        .insert({ email, auth_user_id: authUser!.user!.id, full_name: fullName })
        .select("id")
        .maybeSingle();
      assert.ok(profile?.id);
      await admin!.from("organization_memberships").insert({
        organization_id: orgId,
        user_id: profile.id,
        role,
        status: "active",
      });
      const client = jwtClient();
      assert.ok(client);
      const session = await client.auth.signInWithPassword({ email, password });
      assert.equal(session.error, null, session.error?.message);
      clients.push(client);
      return { profileId: profile.id as string, client, fullName, email };
    }

    try {
      const { data: orgA, error: orgAErr } = await admin
        .from("organizations")
        .insert({
          slug: `itx-016-a-${suffix}`,
          name: "Directory A",
          kind: "customer",
          plan: "saas",
          data_classification: "synthetic_test",
        })
        .select("id")
        .maybeSingle();
      const { data: orgB, error: orgBErr } = await admin
        .from("organizations")
        .insert({
          slug: `itx-016-b-${suffix}`,
          name: "Directory B",
          kind: "customer",
          plan: "saas",
          data_classification: "synthetic_test",
        })
        .select("id")
        .maybeSingle();
      assert.equal(orgAErr, null, orgAErr?.message);
      assert.equal(orgBErr, null, orgBErr?.message);
      orgAId = orgA!.id;
      orgBId = orgB!.id;

      const alice = await provisionUser(orgAId, "owner", "Alice Reviewer", "alice");
      const bob = await provisionUser(orgAId, "product_manager", "Bob Peer", "bob");
      const carol = await provisionUser(orgBId, "owner", "Carol Other Org", "carol");

      const { error: rpcProbeErr } = await alice.client.rpc("org_member_directory", {
        target: orgAId,
      });
      assert.equal(rpcProbeErr, null, rpcProbeErr?.message || "016 RPC missing");

      const directoryA = await loadOrgMemberDirectory(alice.client, orgAId);
      const bobEntry = directoryA.get(bob.profileId);
      assert.equal(bobEntry?.name, "Bob Peer", "peer reviewer name must resolve in same org");

      const unknown = reviewerFromDirectory(directoryA, "00000000-0000-0000-0000-000000000099");
      assert.equal(unknown.name, "Unknown reviewer", "missing member must fail closed");

      const crossOrgRpc = await alice.client.rpc("org_member_directory", { target: orgBId });
      assert.equal(crossOrgRpc.error, null);
      assert.equal((crossOrgRpc.data || []).length, 0, "must not list members of another org");

      const crossOrgDirectory = await loadOrgMemberDirectory(alice.client, orgBId);
      assert.equal(
        crossOrgDirectory.has(carol.profileId),
        false,
        "cross-org directory must not include foreign org members"
      );
      assert.equal(
        reviewerFromDirectory(crossOrgDirectory, carol.profileId).name,
        "Unknown reviewer",
        "foreign reviewer id must fail closed when org context is wrong"
      );

      const peerProfile = await alice.client
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", carol.profileId)
        .maybeSingle();
      assert.equal(peerProfile.data, null, "profiles RLS must block cross-org peer reads");

      const ownOrgProducts = await alice.client.from("products").select("id").eq("organization_id", orgBId);
      assert.equal((ownOrgProducts.data || []).length, 0, "tenant isolation unchanged for products");
    } finally {
      for (const client of clients) {
        if (client) await client.auth.signOut();
      }
      if (orgBId) await deleteOrganizationForTest(orgBId);
      if (orgAId) await deleteOrganizationForTest(orgAId);
    }
  });
});

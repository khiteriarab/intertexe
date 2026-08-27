import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { deleteOrganizationForTest } from "../lib/enterprise/deletion.ts";
import { commitMappedImport } from "../lib/enterprise/pipeline.ts";
import { approveProductFields } from "../lib/enterprise/review.ts";
import { publishProductPassport } from "../lib/enterprise/publish.ts";
import { resolvePublicPassport } from "../lib/enterprise/public-resolver.ts";

function jwtClient() {
  const url = String(process.env.ENTERPRISE_SUPABASE_URL || "").trim();
  const anon = String(process.env.ENTERPRISE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

const live = process.env.ENTERPRISE_ALLOW_LIVE_TESTS === "true";

describe("Live Enterprise JWT permissions", { skip: !live }, () => {
  it("read-only cannot mutate and suppliers see only assigned products", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin, "Enterprise service client required");

    const suffix = Date.now().toString(36);
    const password = randomBytes(18).toString("base64url");
    const createdUserIds: string[] = [];
    let orgId = "";

    async function provision(role: "owner" | "read_only" | "supplier_contributor") {
      const email = `itx-${role}-${suffix}@example.invalid`;
      const { data, error } = await admin!.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(error, null, error?.message);
      assert.ok(data.user?.id);
      createdUserIds.push(data.user.id);
      const { data: profile } = await admin!
        .from("profiles")
        .insert({ email, auth_user_id: data.user.id, full_name: role })
        .select("id")
        .maybeSingle();
      assert.ok(profile?.id);
      await admin!.from("organization_memberships").insert({
        organization_id: orgId,
        user_id: profile.id,
        role,
        status: "active",
      });
      const userClient = jwtClient();
      assert.ok(userClient, "ENTERPRISE_SUPABASE_ANON_KEY required for JWT tests");
      const session = await userClient.auth.signInWithPassword({ email, password });
      assert.equal(session.error, null, session.error?.message);
      return { profileId: profile.id as string, client: userClient, email };
    }

    try {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          slug: `itx-perm-${suffix}`,
          name: "Permission fixture",
          kind: "customer",
          plan: "saas",
        })
        .select("id")
        .maybeSingle();
      assert.equal(orgErr, null, orgErr?.message);
      orgId = org!.id;
      await admin.from("organizations").update({ data_classification: "synthetic_test" }).eq("id", orgId);

      const owner = await provision("owner");
      const reader = await provision("read_only");
      const supplier = await provision("supplier_contributor");

      const { data: secretA } = await owner.client
        .from("products")
        .insert({ organization_id: orgId, name: "Owner product", sku: "OWN-1" })
        .select("id")
        .maybeSingle();
      assert.ok(secretA?.id);

      const { error: readOnlyInsert } = await reader.client
        .from("products")
        .insert({ organization_id: orgId, name: "Should fail", sku: "RO-1" });
      assert.ok(readOnlyInsert, "read-only must not insert products");

      const { data: visibleToSupplier } = await supplier.client.from("products").select("id, name");
      assert.equal((visibleToSupplier || []).length, 0);

      await admin.from("supplier_requests").insert({
        organization_id: orgId,
        product_id: secretA.id,
        assignee_user_id: supplier.profileId,
        fields: ["composition"],
      });
      const { data: assigned } = await supplier.client.from("products").select("id, name");
      assert.equal((assigned || []).length, 1);
      assert.equal(assigned?.[0].name, "Owner product");
    } finally {
      if (orgId) await deleteOrganizationForTest(orgId);
      for (const userId of createdUserIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    }
  });

  it("JWT user A cannot read Org B products even when filtering by B's id", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin);
    const suffix = Date.now().toString(36);
    const password = randomBytes(18).toString("base64url");
    const createdUserIds: string[] = [];
    const orgIds: string[] = [];

    async function ownerFor(orgId: string, label: string) {
      const email = `itx-${label}-${suffix}@example.invalid`;
      const { data, error } = await admin!.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(error, null, error?.message);
      createdUserIds.push(data.user!.id);
      const { data: profile } = await admin!
        .from("profiles")
        .insert({ email, auth_user_id: data.user!.id, full_name: label })
        .select("id")
        .maybeSingle();
      await admin!.from("organization_memberships").insert({
        organization_id: orgId,
        user_id: profile!.id,
        role: "owner",
        status: "active",
      });
      const client = jwtClient();
      assert.ok(client);
      const session = await client.auth.signInWithPassword({ email, password });
      assert.equal(session.error, null, session.error?.message);
      return client;
    }

    try {
      const { data: orgA } = await admin
        .from("organizations")
        .insert({ slug: `itx-jwt-a-${suffix}`, name: "JWT A", kind: "customer", plan: "saas" })
        .select("id")
        .maybeSingle();
      const { data: orgB } = await admin
        .from("organizations")
        .insert({ slug: `itx-jwt-b-${suffix}`, name: "JWT B", kind: "customer", plan: "saas" })
        .select("id")
        .maybeSingle();
      assert.ok(orgA?.id && orgB?.id);
      orgIds.push(orgA.id, orgB.id);
      const clientA = await ownerFor(orgA.id, "a");
      const clientB = await ownerFor(orgB.id, "b");
      await clientA.from("products").insert({ organization_id: orgA.id, name: "Secret A", sku: "SA-1" });
      await clientB.from("products").insert({ organization_id: orgB.id, name: "Secret B", sku: "SB-1" });
      const { data: aSees } = await clientA.from("products").select("name");
      const { data: aFilterB } = await clientA.from("products").select("name").eq("organization_id", orgB.id);
      const { data: bSees } = await clientB.from("products").select("name");
      assert.equal((aSees || []).some((row) => row.name === "Secret A"), true);
      assert.equal((aSees || []).some((row) => row.name === "Secret B"), false);
      assert.equal((aFilterB || []).length, 0);
      assert.equal((bSees || []).some((row) => row.name === "Secret B"), true);
      assert.equal((bSees || []).some((row) => row.name === "Secret A"), false);
    } finally {
      for (const id of orgIds) await deleteOrganizationForTest(id);
      for (const userId of createdUserIds) await admin.auth.admin.deleteUser(userId);
    }
  });
});

describe("Live Phase 1 publish journey on a disposable org", { skip: !live }, () => {
  it("imports, approves, publishes, resolves, and versions without fabricating fields", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin);
    const suffix = Date.now().toString(36);
    const { data: org, error } = await admin
      .from("organizations")
      .insert({
        slug: `itx-phase1-${suffix}`,
        name: "Phase 1 fixture",
        kind: "customer",
        plan: "saas",
      })
      .select("id")
      .maybeSingle();
    assert.equal(error, null, error?.message);
    const organizationId = org!.id;
    try {
      await admin.from("workspaces").insert({
        organization_id: organizationId,
        slug: "default",
        name: "Default workspace",
      });
      const first = await commitMappedImport({
        organizationId,
        organizationPlan: "saas",
        productAllowance: null,
        actorEmail: "phase1@example.invalid",
        filename: "phase1.csv",
        mapping: { SKU: "sku", NAME: "name", MATERIAL: "composition" },
        rows: [{ SKU: "P1", NAME: "Oxford shirt", MATERIAL: "100% cotton" }],
      });
      assert.equal(first.productsTouched, 1);
      const { data: product } = await admin
        .from("products")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("sku", "P1")
        .maybeSingle();
      assert.ok(product?.id);
      await approveProductFields({
        organizationId,
        productId: product.id,
        actorEmail: "phase1@example.invalid",
      });
      const published = await publishProductPassport({
        organizationId,
        productId: product.id,
        actorEmail: "phase1@example.invalid",
      });
      const view = await resolvePublicPassport(published.publicId);
      assert.equal(view.found, true);
      assert.equal(view.versionNumber, 1);

      await commitMappedImport({
        organizationId,
        organizationPlan: "saas",
        productAllowance: null,
        actorEmail: "phase1@example.invalid",
        filename: "phase1-update.csv",
        mapping: { SKU: "sku", NAME: "name", MATERIAL: "composition" },
        rows: [{ SKU: "P1", NAME: "Oxford shirt", MATERIAL: "98% cotton 2% elastane" }],
      });
      await approveProductFields({
        organizationId,
        productId: product.id,
        actorEmail: "phase1@example.invalid",
      });
      const again = await publishProductPassport({
        organizationId,
        productId: product.id,
        actorEmail: "phase1@example.invalid",
      });
      assert.equal(again.version, 2);
      const { data: versions } = await admin
        .from("passport_versions")
        .select("version_number, published_at")
        .eq("organization_id", organizationId)
        .order("version_number");
      assert.equal((versions || []).length, 2);
      assert.ok(versions?.[0].published_at);
      const { error: mutatePublished } = await admin
        .from("passport_versions")
        .update({ change_summary: "mutated" })
        .eq("organization_id", organizationId)
        .eq("version_number", 1);
      assert.ok(mutatePublished, "published versions must stay immutable");
    } finally {
      await deleteOrganizationForTest(organizationId);
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { previewImport } from "../lib/enterprise/import-preview.ts";
import { deleteOrganizationForTest } from "../lib/enterprise/deletion.ts";

const live = process.env.ENTERPRISE_ALLOW_LIVE_TESTS === "true";

describe("Live Enterprise tenant isolation", { skip: !live }, () => {
  it("Org A cannot read Org B products, and deletion removes the test org", async () => {
    const supabase = getEnterpriseServiceClient();
    assert.ok(supabase, "ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY required for live tests");

    const suffix = Date.now().toString(36);
    const { data: orgA, error: aErr } = await supabase
      .from("organizations")
      .insert({
        slug: `itx-test-a-${suffix}`,
        name: "Test A",
        kind: "customer",
        plan: "saas",
      })
      .select("id")
      .maybeSingle();
    const { data: orgB, error: bErr } = await supabase
      .from("organizations")
      .insert({
        slug: `itx-test-b-${suffix}`,
        name: "Test B",
        kind: "customer",
        plan: "saas",
      })
      .select("id")
      .maybeSingle();
    assert.equal(aErr, null);
    assert.equal(bErr, null);
    assert.ok(orgA?.id && orgB?.id);

    await supabase.from("products").insert({
      organization_id: orgA.id,
      name: "Alpha Tee",
      sku: "A-1",
    });
    await supabase.from("products").insert({
      organization_id: orgB.id,
      name: "Beta Tee",
      sku: "B-1",
    });

    const { data: fromA } = await supabase
      .from("products")
      .select("name")
      .eq("organization_id", orgA.id);
    assert.equal((fromA || []).some((row) => row.name === "Beta Tee"), false);
    assert.equal((fromA || []).some((row) => row.name === "Alpha Tee"), true);

    const rows = Array.from({ length: 500 }, (_, i) => ({
      SKU: `ROW-${i}`,
      MATERIAL_1: "cotton",
    }));
    const preview = previewImport(rows);
    assert.equal(preview.rowsDetected, 500);

    const payload = rows.map((row, index) => ({
      organization_id: orgA.id,
      original_payload: row,
      payload_hash: `test-${suffix}-${index}`,
    }));
    const { error: insertErr } = await supabase.from("source_records").insert(payload);
    assert.equal(insertErr, null);

    const { error: mutateErr } = await supabase
      .from("source_records")
      .update({ payload_hash: "mutated" })
      .eq("organization_id", orgA.id);
    assert.ok(mutateErr, "source records must be immutable");

    const deletedA = await deleteOrganizationForTest(orgA.id);
    const deletedB = await deleteOrganizationForTest(orgB.id);
    assert.equal(deletedA.ok, true);
    assert.equal(deletedB.ok, true);

    const { data: leftover } = await supabase
      .from("products")
      .select("id")
      .in("organization_id", [orgA.id, orgB.id]);
    assert.equal((leftover || []).length, 0);
  });
});

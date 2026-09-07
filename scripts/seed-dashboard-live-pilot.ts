/**
 * Expand the live-product pilot so every dashboard module shows real SKUs.
 * Run after seed-consumer-signals-pilot.ts:
 *   npx tsx scripts/seed-dashboard-live-pilot.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { publishProductPassport } from "../lib/enterprise/publish";
import { createSupplierEvidenceRequest } from "../lib/enterprise/supplier-evidence";

loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const ORG_ID = "65e504e7-8238-4d34-81de-d356ac1fe810";
const CATALOG_ID = "dc624786-34b6-4d5e-a390-5eaa0f96700d";

type LiveProduct = {
  style: string;
  sku: string;
  name: string;
  composition: string;
  brand: string;
  category: string;
};

async function main() {
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing ENTERPRISE_SUPABASE_* credentials");
  const client = createClient(url, key);

  const fixture = JSON.parse(
    readFileSync(resolve("lib/enterprise/fixtures/intertexe-live-10-products.json"), "utf8")
  ) as LiveProduct[];

  const { data: liveRows } = await client
    .from("products")
    .select("id, name, sku, style_code, passport_state, category, collection")
    .eq("organization_id", ORG_ID)
    .eq("lifecycle", "active")
    .like("style_code", "ITX-LIVE-%")
    .order("style_code", { ascending: true });

  const live = liveRows || [];
  if (live.length < 10) {
    throw new Error(`Expected 10 ITX-LIVE products, found ${live.length}. Run seed-consumer-signals-pilot.ts first.`);
  }
  console.log(`Live products: ${live.length}`);

  // 1) Archive old customer-zero / browser test SKUs so the dashboard is live-product-first
  const { data: legacy } = await client
    .from("products")
    .select("id, sku, name")
    .eq("organization_id", ORG_ID)
    .eq("lifecycle", "active")
    .or("sku.ilike.CZ-%,name.ilike.%oxford%");
  for (const row of legacy || []) {
    if (String(row.sku || "").startsWith("ITX") || String(row.sku || "").startsWith("P0")) continue;
    if (!String(row.sku || "").startsWith("CZ-") && !/oxford/i.test(String(row.name || ""))) continue;
    await client
      .from("products")
      .update({ lifecycle: "archived", last_updated_at: new Date().toISOString() })
      .eq("id", row.id);
    console.log(`  archived legacy ${row.sku}`);
  }

  const byStyle = new Map(live.map((p) => [p.style_code as string, p]));
  const publishTargets = [
    "ITX-LIVE-01",
    "ITX-LIVE-02",
    "ITX-LIVE-04",
    "ITX-LIVE-05",
    "ITX-LIVE-07",
  ]
    .map((style) => byStyle.get(style))
    .filter(Boolean) as typeof live;

  const readyKeep = ["ITX-LIVE-03", "ITX-LIVE-06", "ITX-LIVE-08"].map((s) => byStyle.get(s)!).filter(Boolean);
  const issueTargets = ["ITX-LIVE-09", "ITX-LIVE-10"].map((s) => byStyle.get(s)!).filter(Boolean);

  // 2) Diversify passport states on a couple of ready products
  if (readyKeep[0]) {
    await client
      .from("products")
      .update({ passport_state: "review_required", data_completeness: 0.7 })
      .eq("id", readyKeep[0].id);
  }
  if (readyKeep[1]) {
    await client
      .from("products")
      .update({ passport_state: "ready", data_completeness: 0.9 })
      .eq("id", readyKeep[1].id);
  }

  // 3) Open issues on polyester blend products + one care-instruction gap
  for (const product of issueTargets) {
    const { data: existing } = await client
      .from("issues")
      .select("id")
      .eq("organization_id", ORG_ID)
      .eq("product_id", product.id)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    if (existing?.id) continue;

    const { data: issue } = await client
      .from("issues")
      .insert({
        organization_id: ORG_ID,
        product_id: product.id,
        issue_type: "validation",
        severity: "high",
        title: "Polyester blend may face alternative-seeking pressure",
        detail:
          "field:composition|Consumer signals show polyester is rare in the discoverable mix. Review whether a natural-fiber alternative should be linked before publish.",
        original_value: fixture.find((f) => f.sku === product.sku)?.composition || null,
        interpreted_value: "Contains polyester",
        status: "open",
      })
      .select("id")
      .maybeSingle();

    await client
      .from("products")
      .update({ passport_state: "review_required", data_completeness: 0.75 })
      .eq("id", product.id);

    console.log(`  open issue on ${product.style_code}: ${issue?.id}`);
  }

  // Missing care instructions on wool beanie → supplier evidence path
  const beanie = byStyle.get("ITX-LIVE-06");
  let careIssueId: string | null = null;
  if (beanie) {
    const { data: existingCare } = await client
      .from("issues")
      .select("id")
      .eq("organization_id", ORG_ID)
      .eq("product_id", beanie.id)
      .eq("issue_type", "missing_data")
      .eq("status", "open")
      .maybeSingle();
    if (existingCare?.id) {
      careIssueId = existingCare.id;
    } else {
      const { data: careIssue } = await client
        .from("issues")
        .insert({
          organization_id: ORG_ID,
          product_id: beanie.id,
          issue_type: "missing_data",
          severity: "high",
          title: "Care instructions missing",
          detail: "field:care_instructions|Required for complete passport consumer care section.",
          status: "open",
        })
        .select("id")
        .maybeSingle();
      careIssueId = careIssue?.id || null;
      await client.from("missing_data_register").insert({
        organization_id: ORG_ID,
        product_id: beanie.id,
        field_key: "care_instructions",
        why_it_matters: "Shoppers and DPP care sections need wash/care guidance.",
        suggested_source: "Mill or brand care label",
        owner_role: "supplier",
        status: "open",
      });
      await client
        .from("products")
        .update({ passport_state: "incomplete", data_completeness: 0.55 })
        .eq("id", beanie.id);
      console.log(`  missing care issue on ${beanie.style_code}`);
    }
  }

  // 4) Publish passports for clean natural-fiber SKUs
  for (const product of publishTargets) {
    const { data: existingPassport } = await client
      .from("passports")
      .select("id, state")
      .eq("organization_id", ORG_ID)
      .eq("product_id", product.id)
      .maybeSingle();
    if (existingPassport?.state === "published") {
      console.log(`  already published ${product.style_code}`);
      continue;
    }
    try {
      const result = await publishProductPassport({
        client,
        organizationId: ORG_ID,
        productId: product.id,
      });
      console.log(`  published ${product.style_code} → ${result.publicId} v${result.version}`);
    } catch (err) {
      console.error(`  publish failed ${product.style_code}:`, err instanceof Error ? err.message : err);
    }
  }

  // 5) Supplier + evidence request from care issue
  const { data: profile } = await client.from("profiles").select("id").limit(1).maybeSingle();
  if (careIssueId) {
    const { data: existingReq } = await client
      .from("supplier_requests")
      .select("id")
      .eq("organization_id", ORG_ID)
      .eq("issue_id", careIssueId)
      .maybeSingle();
    if (!existingReq?.id) {
      const due = new Date();
      due.setDate(due.getDate() + 10);
      try {
        const created = await createSupplierEvidenceRequest({
          client,
          organizationId: ORG_ID,
          issueId: careIssueId,
          requesterId: profile?.id || null,
          supplierName: "Norrøna Material Lab",
          supplierEmail: "materials@norrona-pilot.example",
          dueAt: due.toISOString(),
          notes: "Need care label PDF for wool beanie passport.",
        });
        console.log(`  supplier request ${created.requestId}`);
      } catch (err) {
        console.error("  supplier seed failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  // Ensure at least one supplier exists even if care path failed
  const { count: supplierCount } = await client
    .from("suppliers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ORG_ID);
  if (!supplierCount) {
    await client.from("suppliers").insert({
      organization_id: ORG_ID,
      name: "Atlantic Textile Mill",
      email: "compliance@atlantic-mill.example",
    });
    console.log("  seeded fallback supplier");
  }

  // 6) Import + source records for Files module
  const idempotencyKey = "live-pilot-10-products-v1";
  let { data: importRow } = await client
    .from("imports")
    .select("id")
    .eq("organization_id", ORG_ID)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (!importRow?.id) {
    const created = await client
      .from("imports")
      .insert({
        organization_id: ORG_ID,
        catalog_id: CATALOG_ID,
        idempotency_key: idempotencyKey,
        original_filename: "intertexe-live-10-products.csv",
        mapping: {
          "Style No": "style_code",
          SKU: "sku",
          "Product Name": "name",
          GTIN: "gtin",
          Category: "category",
          Composition: "composition",
          "Country of Origin": "manufacturing_country",
        },
        status: "succeeded",
        created_by: profile?.id || null,
      })
      .select("id")
      .maybeSingle();
    importRow = created.data;
    console.log(`  import ${importRow?.id}`);
  }

  if (importRow?.id) {
    for (const product of live) {
      const { data: existingSource } = await client
        .from("source_records")
        .select("id")
        .eq("organization_id", ORG_ID)
        .eq("product_id", product.id)
        .eq("import_id", importRow.id)
        .maybeSingle();
      if (existingSource?.id) continue;
      const fixtureRow = fixture.find((f) => f.sku === product.sku);
      await client.from("source_records").insert({
        organization_id: ORG_ID,
        import_id: importRow.id,
        product_id: product.id,
        source_system: "intertexe_live_catalog",
        source_url: null,
        retrieved_at: new Date().toISOString(),
        original_payload: fixtureRow || { sku: product.sku, name: product.name },
        payload_hash: `live:${product.sku}`,
      });
    }
    console.log("  source records linked");
  }

  // 7) Activity feed entries tied to live ops
  const activityTitles = [
    {
      title: "Imported intertexe-live-10-products.csv",
      detail: "10 live INTERTEXE catalog products with composition",
    },
    {
      title: "Approved identity and composition",
      detail: `product:${publishTargets[0]?.id || live[0].id}`,
    },
    {
      title: "Updated material composition — catalog refresh",
      detail: "Normalized live HQ compositions into enterprise fields",
    },
    {
      title: "Opened consumer signals review",
      detail: "Benchmarking + governed aggregates linked to live SKUs",
    },
  ];
  for (const row of activityTitles) {
    const { data: existing } = await client
      .from("activity_events")
      .select("id")
      .eq("organization_id", ORG_ID)
      .eq("title", row.title)
      .maybeSingle();
    if (existing?.id) continue;
    await client.from("activity_events").insert({
      organization_id: ORG_ID,
      actor_id: profile?.id || null,
      title: row.title,
      detail: row.detail,
    });
  }
  console.log("  activity events ensured");

  // 8) Workflow stage assignments on entitlements
  const { data: org } = await client
    .from("organizations")
    .select("entitlements")
    .eq("id", ORG_ID)
    .maybeSingle();
  const entitlements = { ...(org?.entitlements || {}) } as Record<string, unknown>;
  entitlements.dpp_workflow_assignments = {
    import: profile?.id || null,
    review: profile?.id || null,
    resolve: profile?.id || null,
    publish: profile?.id || null,
    monitor: profile?.id || null,
  };
  await client.from("organizations").update({ entitlements }).eq("id", ORG_ID);
  console.log("  workflow assignments set");

  // Summary
  const [{ count: products }, { count: openIssues }, { count: passports }, { count: suppliers }, { count: activity }] =
    await Promise.all([
      client.from("products").select("id", { count: "exact", head: true }).eq("organization_id", ORG_ID).eq("lifecycle", "active"),
      client.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", ORG_ID).eq("status", "open"),
      client.from("passports").select("id", { count: "exact", head: true }).eq("organization_id", ORG_ID).eq("state", "published"),
      client.from("suppliers").select("id", { count: "exact", head: true }).eq("organization_id", ORG_ID),
      client.from("activity_events").select("id", { count: "exact", head: true }).eq("organization_id", ORG_ID),
    ]);

  console.log("\nDashboard live summary");
  console.log({ products, openIssues, publishedPassports: passports, suppliers, activity });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

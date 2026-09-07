/**
 * Seed INTERTEXE customer-zero with 10 live catalog products + governed
 * market aggregates derived from INTERTEXE consumer assortment samples.
 *
 * Run: npx tsx scripts/seed-consumer-signals-pilot.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const ORG_ID = "65e504e7-8238-4d34-81de-d356ac1fe810";
const CATALOG_ID = "dc624786-34b6-4d5e-a390-5eaa0f96700d";

type LiveProduct = {
  style: string;
  sku: string;
  name: string;
  gtin: string;
  category: string;
  composition: string;
  brand: string;
  natural_fiber_percent: number | null;
  image_url: string | null;
  country_of_origin: string;
  source_id: string;
};

async function main() {
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing ENTERPRISE_SUPABASE_* credentials");

  const ent = createClient(url, key);
  const fixturePath = resolve("lib/enterprise/fixtures/intertexe-live-10-products.json");
  const products = JSON.parse(readFileSync(fixturePath, "utf8")) as LiveProduct[];

  console.log(`Seeding ${products.length} live products into org ${ORG_ID}`);

  let touched = 0;
  for (const row of products) {
    const { data: existing } = await ent
      .from("products")
      .select("id")
      .eq("organization_id", ORG_ID)
      .eq("sku", row.sku)
      .maybeSingle();

    let productId = existing?.id as string | undefined;
    if (productId) {
      await ent
        .from("products")
        .update({
          name: row.name,
          style_code: row.style,
          category: row.category,
          season: "SS26",
          collection: row.brand,
          lifecycle: "active",
          passport_state: "ready",
          data_completeness: 0.85,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    } else {
      const { data: created, error } = await ent
        .from("products")
        .insert({
          organization_id: ORG_ID,
          catalog_id: CATALOG_ID,
          name: row.name,
          sku: row.sku,
          style_code: row.style,
          category: row.category,
          season: "SS26",
          collection: row.brand,
          lifecycle: "active",
          passport_state: "ready",
          data_completeness: 0.85,
          last_updated_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (error || !created?.id) throw new Error(error?.message || `Failed to insert ${row.sku}`);
      productId = created.id;
    }

    const fields = [
      { field_key: "composition", value: row.composition },
      { field_key: "manufacturing_country", value: row.country_of_origin },
      { field_key: "name", value: row.name },
    ];

    for (const field of fields) {
      const { data: existingField } = await ent
        .from("normalized_fields")
        .select("id")
        .eq("organization_id", ORG_ID)
        .eq("product_id", productId)
        .eq("field_key", field.field_key)
        .maybeSingle();

      const payload = {
        organization_id: ORG_ID,
        product_id: productId,
        field_key: field.field_key,
        original_value: field.value,
        normalized_value: field.value,
        transformation_method: "live_hq_pilot_seed",
        confidence: 0.95,
        state: "approved",
        access_class: field.field_key === "composition" || field.field_key === "name" ? "public" : "internal",
        explanation: `Seeded from INTERTEXE live catalog product ${row.source_id}`,
        locked: false,
        version: 1,
        intelligence_kind: "observed",
        ontology_version: "itx.ontology.v1",
      };

      if (existingField?.id) {
        await ent.from("normalized_fields").update(payload).eq("id", existingField.id);
      } else {
        await ent.from("normalized_fields").insert(payload);
      }
    }

    if (row.gtin) {
      const { data: existingId } = await ent
        .from("product_identifiers")
        .select("id")
        .eq("organization_id", ORG_ID)
        .eq("product_id", productId)
        .eq("identifier_type", "gtin")
        .maybeSingle();
      if (!existingId) {
        await ent.from("product_identifiers").insert({
          organization_id: ORG_ID,
          product_id: productId,
          identifier_type: "gtin",
          identifier_value: row.gtin,
          active: true,
        });
      }
    }

    touched += 1;
    console.log(`  ✓ ${row.style} · ${row.name}`);
  }

  // Market assortment benchmarks from INTERTEXE consumer catalog samples
  const { data: existingDataset } = await ent
    .from("benchmark_datasets")
    .select("id")
    .eq("source", "intertexe_consumer_assortment")
    .eq("category", "apparel")
    .eq("market", "eu_fashion")
    .maybeSingle();

  let datasetId = existingDataset?.id as string | undefined;
  if (!datasetId) {
    const { data: created, error } = await ent
      .from("benchmark_datasets")
      .insert({
        source: "intertexe_consumer_assortment",
        category: "apparel",
        market: "eu_fashion",
        period_start: "2026-01-01",
        period_end: "2026-09-01",
        sample_size: 800,
        min_sample_size: 50,
        status: "approved",
        provenance: "INTERTEXE displayable consumer catalog sample",
        aggregation_rules: "median fiber / completeness metrics across approved displayable SKUs",
        permission_scope: "plan",
        methodology_version: "assortment.v1",
        data_classification: "aggregate_enterprise",
        calculated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error || !created?.id) throw new Error(error?.message || "benchmark dataset insert failed");
    datasetId = created.id;
  } else {
    await ent
      .from("benchmark_datasets")
      .update({
        sample_size: 800,
        status: "approved",
        calculated_at: new Date().toISOString(),
      })
      .eq("id", datasetId);
  }

  for (const plan of ["internal", "saas", "founding_pilot"]) {
    const { data: perm } = await ent
      .from("benchmark_permissions")
      .select("id")
      .eq("dataset_id", datasetId)
      .eq("plan", plan)
      .maybeSingle();
    if (!perm) {
      await ent.from("benchmark_permissions").insert({ dataset_id: datasetId, plan });
    }
  }

  const metrics: Array<{ metric_key: string; median: number }> = [
    { metric_key: "natural_fiber_share", median: 98.5 },
    { metric_key: "synthetic_share", median: 1.5 },
    { metric_key: "cotton_share", median: 42 },
    { metric_key: "wool_share", median: 12 },
    { metric_key: "linen_share", median: 8.5 },
    { metric_key: "silk_share", median: 6 },
    { metric_key: "material_data_complete", median: 94 },
    { metric_key: "passport_ready_share", median: 38 },
  ];

  for (const metric of metrics) {
    const { data: existing } = await ent
      .from("benchmark_metrics")
      .select("id")
      .eq("dataset_id", datasetId)
      .eq("metric_key", metric.metric_key)
      .maybeSingle();
    if (existing?.id) {
      await ent.from("benchmark_metrics").update({ median: metric.median }).eq("id", existing.id);
    } else {
      await ent.from("benchmark_metrics").insert({
        dataset_id: datasetId,
        metric_key: metric.metric_key,
        median: metric.median,
        p25: Math.max(0, metric.median - 8),
        p75: Math.min(100, metric.median + 8),
        metric_definition: `Governed peer median for ${metric.metric_key}`,
        time_period: "2026-H1",
      });
    }
  }

  const aggregates = [
    {
      metric_key: "category_linen_preference",
      cohort: "apparel_shoppers",
      category: "dress",
      geography: "eu",
      sample_size: 500,
      min_cohort_size: 50,
      methodology: "Share of displayable dress SKUs listing linen in composition",
      methodology_version: "consumer_signals.v1",
      source_channel: "intertexe_catalog",
      privacy_classification: "aggregate_enterprise",
      status: "approved",
      provenance: "INTERTEXE consumer catalog aggregate — no user identities",
      payload: {
        headline: "Consumers searching dresses encounter linen more often than shirts",
        value: 9.4,
        unit: "pct_of_category",
        comparison_category: "shirt",
        comparison_value: 6.6,
        narrative:
          "In INTERTEXE market assortment, linen appears in 9.4% of dresses vs 6.6% of shirts — a category tilt brands can lean into.",
      },
    },
    {
      metric_key: "natural_fiber_save_affinity",
      cohort: "apparel_shoppers",
      category: "apparel",
      geography: "eu",
      sample_size: 800,
      min_cohort_size: 50,
      methodology: "Share of displayable SKUs at or above 90% natural fiber",
      methodology_version: "consumer_signals.v1",
      source_channel: "intertexe_catalog",
      privacy_classification: "aggregate_enterprise",
      status: "approved",
      provenance: "INTERTEXE consumer catalog aggregate — no user identities",
      payload: {
        headline: "Products above 90% natural fiber dominate the discoverable assortment",
        value: 94.1,
        unit: "pct_of_assortment",
        threshold: 90,
        narrative:
          "94% of sampled displayable products are ≥90% natural fiber — high-natural composition is the INTERTEXE market default shoppers already see.",
      },
    },
    {
      metric_key: "polyester_alternative_pressure",
      cohort: "apparel_shoppers",
      category: "apparel",
      geography: "eu",
      sample_size: 800,
      min_cohort_size: 50,
      methodology: "Share of displayable SKUs listing polyester; rarity implies alternative-fiber density nearby",
      methodology_version: "consumer_signals.v1",
      source_channel: "intertexe_catalog",
      privacy_classification: "aggregate_enterprise",
      status: "approved",
      provenance: "INTERTEXE consumer catalog aggregate — no user identities",
      payload: {
        headline: "Polyester is rare in the discoverable mix — blends stand out",
        value: 3.3,
        unit: "pct_of_assortment",
        narrative:
          "Only 3.3% of sampled displayable products list polyester. SKUs with polyester sit in a thin cohort where shoppers can readily find natural-fiber alternatives.",
      },
    },
    {
      metric_key: "category_discovery_breadth",
      cohort: "apparel_shoppers",
      category: "apparel",
      geography: "eu",
      sample_size: 800,
      min_cohort_size: 50,
      methodology: "Distinct apparel category codes in displayable INTERTEXE assortment sample",
      methodology_version: "consumer_signals.v1",
      source_channel: "intertexe_catalog",
      privacy_classification: "aggregate_enterprise",
      status: "approved",
      provenance: "INTERTEXE consumer catalog aggregate — no user identities",
      payload: {
        headline: "Shoppers browse across a wide category surface before they choose a fiber",
        value: 12,
        unit: "category_codes",
        narrative:
          "Discovery spans shirts, knitwear, trousers, dresses, and accessories — material signals must read clearly per category, not just at brand level.",
      },
    },
  ];

  for (const row of aggregates) {
    const { data: existing } = await ent
      .from("consumer_intelligence_aggregates")
      .select("id")
      .eq("metric_key", row.metric_key)
      .eq("category", row.category)
      .eq("geography", row.geography)
      .maybeSingle();

    const payload = {
      ...row,
      period_start: "2026-01-01",
      period_end: "2026-09-01",
      metric_version: "v1",
      calculated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await ent.from("consumer_intelligence_aggregates").update(payload).eq("id", existing.id);
    } else {
      await ent.from("consumer_intelligence_aggregates").insert(payload);
    }
    console.log(`  ✓ aggregate ${row.metric_key}`);
  }

  console.log(`\nDone. Products touched: ${touched}. Dataset: ${datasetId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

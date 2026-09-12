/**
 * Seed full governed lifecycle for Customer Zero case study (ITX-LIVE-01) and republish.
 * Run: npx tsx scripts/provision-case-study-lifecycle.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  CASE_STUDY_PUBLIC_FIELDS,
  CASE_STUDY_SUPPLY_CHAIN,
  PASSPORT_CASE_STUDY,
} from "../lib/enterprise/passport-case-study";
import { publishProductPassport } from "../lib/enterprise/publish";

loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const ORG_SLUG = "intertexe";

async function main() {
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing ENTERPRISE_SUPABASE_* credentials");
  const client = createClient(url, key);

  const { data: org } = await client.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle();
  if (!org?.id) throw new Error(`Organization ${ORG_SLUG} not found`);

  const { data: product } = await client
    .from("products")
    .select("id, name, style_code")
    .eq("organization_id", org.id)
    .eq("style_code", PASSPORT_CASE_STUDY.styleCode)
    .maybeSingle();
  if (!product?.id) throw new Error(`Product ${PASSPORT_CASE_STUDY.styleCode} not found`);

  console.log(`Case study product: ${product.name} (${product.id})`);

  const { error: productUpdateError } = await client
    .from("products")
    .update({
      name: PASSPORT_CASE_STUDY.productName,
      sku: PASSPORT_CASE_STUDY.sku,
    })
    .eq("id", product.id);
  if (productUpdateError) {
    console.warn("Product rename skipped:", productUpdateError.message);
  } else {
    console.log(`  renamed → ${PASSPORT_CASE_STUDY.productName} (${PASSPORT_CASE_STUDY.sku})`);
  }

  for (const node of CASE_STUDY_SUPPLY_CHAIN) {
    const { error } = await client.from("supply_chain_nodes").upsert(
      {
        organization_id: org.id,
        product_id: product.id,
        ...node,
      },
      { onConflict: "product_id,tier" }
    );
    if (error) throw new Error(`supply_chain_nodes tier ${node.tier}: ${error.message}`);
    console.log(`  tier ${node.tier} · ${node.facility_name} · ${node.country_code}`);
  }

  for (const [fieldKey, value] of Object.entries(CASE_STUDY_PUBLIC_FIELDS)) {
    const { data: existing } = await client
      .from("normalized_fields")
      .select("id")
      .eq("organization_id", org.id)
      .eq("product_id", product.id)
      .eq("field_key", fieldKey)
      .maybeSingle();

    const payload = {
      organization_id: org.id,
      product_id: product.id,
      field_key: fieldKey,
      original_value: value,
      normalized_value: value,
      transformation_method: "case_study_seed",
      confidence: 0.95,
      state: "approved",
      access_class: "public",
      explanation: "Customer Zero case study — governed lifecycle demo for sales",
      locked: false,
      version: 1,
      intelligence_kind: "observed",
      ontology_version: "itx.ontology.v1",
    };

    if (existing?.id) {
      const { error } = await client.from("normalized_fields").update(payload).eq("id", existing.id);
      if (error) throw new Error(`field ${fieldKey}: ${error.message}`);
    } else {
      const { error } = await client.from("normalized_fields").insert(payload);
      if (error) throw new Error(`field ${fieldKey}: ${error.message}`);
    }
    console.log(`  field ${fieldKey}`);
  }

  try {
    const published = await publishProductPassport({
      client,
      organizationId: org.id,
      productId: product.id,
    });
    console.log(`Republished passport v${published.version} → ${published.url}`);
  } catch (err) {
    console.warn(
      "Republish skipped:",
      err instanceof Error ? err.message : err,
      "(live public fields still merge at resolver)"
    );
  }

  console.log(`\nScan: https://www.intertexe.com/p/${PASSPORT_CASE_STUDY.publicId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

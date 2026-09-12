/**
 * Customer Zero integrity audit — fixture + optional live DB cross-check.
 * Run: npx tsx scripts/audit-customer-zero-integrity.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { buildConsumerPassportContent } from "../lib/enterprise/public-passport-content";
import { auditCustomerZeroFixtures, auditPassportIntegrity } from "../lib/enterprise/passport-integrity";
import { pilotCatalog } from "../lib/enterprise/pilot-product-media";

loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const ORG_ID = "65e504e7-8238-4d34-81de-d356ac1fe810";

async function main() {
  const fixtureRows = auditCustomerZeroFixtures();
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  const client = url && key ? createClient(url, key) : null;

  const lines: string[] = [
    "# Customer Zero integrity audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Fixture audit (offline)",
    "",
    "| Style | Product | Status | Resale eligible | Issues |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const row of fixtureRows) {
    const issues = row.checks.map((c) => c.message).join("; ") || "—";
    lines.push(
      `| ${row.fixture.style} | ${row.fixture.name.slice(0, 40)} | ${row.status} | ${row.resaleEligible ? "yes" : "**no**"} | ${issues} |`
    );
  }

  if (client) {
    lines.push("", "## Live DB cross-check", "");
    for (const pilot of pilotCatalog()) {
      const { data: product } = await client
        .from("products")
        .select("id, name, sku, style_code, category")
        .eq("organization_id", ORG_ID)
        .eq("style_code", pilot.style)
        .maybeSingle();

      if (!product) {
        lines.push(`- **${pilot.style}**: not found in DB`);
        continue;
      }

      const [{ data: fields }, { data: traceNodes }, { data: identity }] = await Promise.all([
        client
          .from("normalized_fields")
          .select("field_key, normalized_value")
          .eq("organization_id", ORG_ID)
          .eq("product_id", product.id)
          .eq("access_class", "public"),
        client
          .from("supply_chain_nodes")
          .select("tier_label, facility_name, country_code")
          .eq("organization_id", ORG_ID)
          .eq("product_id", product.id),
        client
          .from("persistent_identities")
          .select("public_id")
          .eq("organization_id", ORG_ID)
          .eq("product_id", product.id)
          .eq("active", true)
          .maybeSingle(),
      ]);

      const publicFields = (fields || []).map((f) => ({
        key: f.field_key,
        value: String(f.normalized_value),
      }));

      const content = buildConsumerPassportContent({
        productName: product.name,
        sku: product.sku,
        styleCode: product.style_code,
        category: product.category,
        brand: pilot.brand,
        publicId: identity?.public_id,
        snapshotFields: publicFields,
        traceNodes: traceNodes || [],
      });

      const integrity = auditPassportIntegrity({
        styleCode: product.style_code,
        sku: product.sku,
        productName: product.name,
        brand: pilot.brand,
        category: product.category,
        composition: content.composition,
        imageUrl: content.imageUrl,
        traceNodes: traceNodes || [],
        journeyStages: content.journeyStages,
        careInstructions: publicFields.find((f) => f.key === "care_instructions")?.value,
        dataSource: "published",
      });

      lines.push(
        `- **${pilot.style}** (${identity?.public_id || "no public id"}): integrity \`${integrity.status}\`, resale ${integrity.resaleEligible ? "eligible" : "**blocked**"}`
      );
      for (const check of integrity.checks) {
        lines.push(`  - ${check.severity}: ${check.message}`);
      }
    }
  } else {
    lines.push("", "_Live DB skipped — set ENTERPRISE_SUPABASE_URL and ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY._");
  }

  lines.push("", "## Phase 2 acceptance product", "", "**ITX-LIVE-01** — God's True Cashmere linen shirt (`itx_4p2h31174z5e4f6n6f1a`)");

  const outDir = resolve("scripts/output");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "customer-zero-integrity-audit.md");
  writeFileSync(outPath, lines.join("\n"));
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Provision draft QR carriers for all ITX-LIVE pilot products that are publish-ready.
 * Run: npx tsx scripts/provision-pilot-qr.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { provisionDraftQrCarrier } from "../lib/enterprise/carriers";
import { publishabilityForProduct } from "../lib/enterprise/publish";

loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const ORG_ID = "65e504e7-8238-4d34-81de-d356ac1fe810";

async function main() {
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing ENTERPRISE_SUPABASE_* credentials");
  const client = createClient(url, key);

  const { data: products } = await client
    .from("products")
    .select("id, name, style_code, sku")
    .eq("organization_id", ORG_ID)
    .eq("lifecycle", "active")
    .like("style_code", "ITX-LIVE-%")
    .order("style_code");

  for (const product of products || []) {
    const check = await publishabilityForProduct(client, ORG_ID, product.id);
    if (check.status === "blocked") {
      console.log(`  skip ${product.style_code} — ${check.blockers.join("; ")}`);
      continue;
    }
    try {
      const carrier = await provisionDraftQrCarrier(client, ORG_ID, product.id, {
        batchLabel: "customer-zero-pilot",
      });
      console.log(`  QR ${product.style_code} → ${carrier.public_url} (${carrier.state})`);
    } catch (err) {
      console.error(`  failed ${product.style_code}:`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

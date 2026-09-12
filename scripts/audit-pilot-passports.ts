/**
 * Audit Customer Zero pilot products — images, carriers, passport state.
 * Run: npx tsx scripts/audit-pilot-passports.ts
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { pilotCatalog, pilotProductImage } from "../lib/enterprise/pilot-product-media";

loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const ORG_ID = "65e504e7-8238-4d34-81de-d356ac1fe810";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");

type AuditRow = {
  style: string;
  name: string;
  brand: string;
  imageAvailable: boolean;
  imageSource: string;
  productId: string | null;
  publicId: string | null;
  qrGenerated: boolean;
  qrResolves: boolean;
  composition: boolean;
  origin: boolean;
  manufacturer: boolean;
  supplier: boolean;
  traceability: boolean;
  care: boolean;
  certification: boolean;
  nextLife: string;
  passportState: string | null;
  completeness: string;
  missing: string[];
};

async function main() {
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  const fixture = pilotCatalog();

  let client: ReturnType<typeof createClient> | null = null;
  if (url && key) {
    client = createClient(url, key);
  }

  const rows: AuditRow[] = [];

  for (const pilot of fixture) {
    const missing: string[] = [];
    const imageUrl = pilotProductImage(pilot.sku, pilot.style);
    if (!imageUrl) missing.push("product image");
    if (!pilot.composition) missing.push("composition");

    let productId: string | null = null;
    let publicId: string | null = null;
    let qrGenerated = false;
    let qrResolves = false;
    let passportState: string | null = null;
    let origin = Boolean(pilot.country_of_origin);
    let manufacturer = false;
    let supplier = false;
    let traceability = false;
    let care = false;
    let certification = false;

    if (client) {
      const { data: product } = await client
        .from("products")
        .select("id, passport_state, data_completeness")
        .eq("organization_id", ORG_ID)
        .eq("style_code", pilot.style)
        .maybeSingle();

      productId = product?.id || null;
      passportState = product?.passport_state || null;

      if (productId) {
        const [{ data: fields }, { data: passport }, { data: nodes }, { data: carriers }] = await Promise.all([
          client
            .from("normalized_fields")
            .select("field_key, normalized_value, access_class")
            .eq("organization_id", ORG_ID)
            .eq("product_id", productId),
          client
            .from("passports")
            .select("id, public_id, state")
            .eq("organization_id", ORG_ID)
            .eq("product_id", productId)
            .maybeSingle(),
          client
            .from("supply_chain_nodes")
            .select("id")
            .eq("organization_id", ORG_ID)
            .eq("product_id", productId)
            .limit(1),
          client
            .from("data_carriers")
            .select("id, carrier_type, state, public_url")
            .eq("organization_id", ORG_ID)
            .eq("product_id", productId)
            .eq("carrier_type", "qr")
            .in("state", ["draft", "active"]),
        ]);

        publicId = passport?.public_id || null;
        origin = Boolean(
          fields?.some((f) => f.field_key === "manufacturing_country" && f.normalized_value) ||
            pilot.country_of_origin
        );
        manufacturer = Boolean(fields?.some((f) => f.field_key === "manufacturer" && f.normalized_value));
        care = Boolean(fields?.some((f) => f.field_key === "care_instructions" && f.normalized_value));
        certification = Boolean(fields?.some((f) => f.field_key === "certification" && f.normalized_value));
        traceability = Boolean(nodes?.length);
        supplier = traceability;

        const qr = carriers?.[0];
        qrGenerated = Boolean(qr);
        if (publicId && passport?.state === "published") {
          try {
            const res = await fetch(`${SITE}/p/${publicId}`, { redirect: "follow" });
            qrResolves = res.ok;
          } catch {
            qrResolves = false;
          }
        }

        if (!origin) missing.push("origin");
        if (!manufacturer) missing.push("manufacturer");
        if (!traceability) missing.push("traceability tiers 2–4");
        if (!care) missing.push("care instructions");
        if (!certification) missing.push("certification/evidence");
        if (!publicId) missing.push("public identity");
        if (!qrGenerated) missing.push("QR carrier");
        if (passport?.state !== "published") missing.push("published passport");
      } else {
        missing.push("product not in database");
      }
    } else {
      missing.push("enterprise DB not linked locally");
    }

    rows.push({
      style: pilot.style,
      name: pilot.name,
      brand: pilot.brand || "—",
      imageAvailable: Boolean(imageUrl),
      imageSource: imageUrl ? pilot.image_url || "fixture" : "none",
      productId,
      publicId,
      qrGenerated,
      qrResolves,
      composition: Boolean(pilot.composition),
      origin,
      manufacturer,
      supplier,
      traceability,
      care,
      certification,
      nextLife: "INTERTEXE guidance only",
      passportState,
      completeness: missing.length === 0 ? "complete" : `${Math.max(0, 100 - missing.length * 8)}% est.`,
      missing,
    });
  }

  const md = [
    "# Customer Zero — 10 Pilot Product Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Product | Brand | Image | Public ID | QR | Published | Composition | Origin | Care | Missing |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${r.name.slice(0, 40)} | ${r.brand} | ${r.imageAvailable ? "Y" : "N"} | ${r.publicId || "—"} | ${r.qrGenerated ? "Y" : "N"} | ${r.passportState || "—"} | ${r.composition ? "Y" : "N"} | ${r.origin ? "Y" : "N"} | ${r.care ? "Y" : "N"} | ${r.missing.join(", ") || "—"} |`
    ),
    "",
    "## Detail",
    "",
    ...rows.map(
      (r) =>
        `### ${r.style} — ${r.name}\n- Image: ${r.imageAvailable ? r.imageSource : "missing"}\n- QR resolves: ${r.qrResolves ? "yes" : "no"}\n- Traceability nodes: ${r.traceability ? "yes" : "no"}\n- Missing: ${r.missing.join("; ") || "none"}`
    ),
  ].join("\n");

  const outDir = resolve("scripts/output");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "pilot-passport-audit.md");
  writeFileSync(outPath, md);
  console.log(md);
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

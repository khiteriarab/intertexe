/**
 * Sync INTERTEXE Paddle sandbox catalog (products + prices).
 * Requires PADDLE_API_KEY in environment — never commit the key.
 *
 * Usage: PADDLE_API_KEY=... npx tsx scripts/sync-paddle-catalog.ts
 *
 * Writes IDs to scripts/output/paddle-catalog-ids.json (gitignored output dir ok).
 *
 * Catalog matches public commercial model:
 *   Foundation $499/mo + $1,500 implementation
 *   Intelligence $1,250/mo + $3,500 implementation
 *   Enterprise — manual / invoice (no Paddle subscription product)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLAN_DEFINITIONS } from "../lib/enterprise/plans.ts";
import {
  FOUNDATION_IMPLEMENTATION_USD,
  FOUNDATION_MONTHLY_USD,
  FOUNDATION_PRODUCT_LIMIT,
  INTELLIGENCE_IMPLEMENTATION_USD,
  INTELLIGENCE_MONTHLY_USD,
  INTELLIGENCE_PRODUCT_LIMIT,
} from "../lib/enterprise/pricing.ts";
import { getPaddleApiBase, getPaddleEnvironment } from "../lib/enterprise/paddle.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const CATALOG = [
  {
    name: "INTERTEXE Foundation",
    description: `Product data foundation — up to ${FOUNDATION_PRODUCT_LIMIT.toLocaleString("en-US")} products and passports, governed records, DPP publishing, and core transparency tools.`,
    priceUsd: FOUNDATION_MONTHLY_USD,
    interval: "month" as const,
    envKey: "PADDLE_PRICE_FOUNDATION",
    legacyEnvKeys: ["PADDLE_PRICE_PLATFORM", "PADDLE_PRICE_SAAS_PLATFORM", "PADDLE_PRICE_SAAS_STARTER"],
    planKey: "professional" as const,
    kind: "subscription" as const,
  },
  {
    name: "INTERTEXE Intelligence",
    description: `Product intelligence — up to ${INTELLIGENCE_PRODUCT_LIMIT.toLocaleString("en-US")} products and passports, white-label passports, API, circularity, and advanced analytics.`,
    priceUsd: INTELLIGENCE_MONTHLY_USD,
    interval: "month" as const,
    envKey: "PADDLE_PRICE_INTELLIGENCE",
    legacyEnvKeys: ["PADDLE_PRICE_PROFESSIONAL", "PADDLE_PRICE_SAAS_PROFESSIONAL", "PADDLE_PRICE_SAAS_GROWTH"],
    planKey: "platform" as const,
    kind: "subscription" as const,
  },
  {
    name: "INTERTEXE Foundation Implementation",
    description: "Connect, configure, and launch — Foundation implementation (migration, rules, publishing, training).",
    priceUsd: FOUNDATION_IMPLEMENTATION_USD,
    interval: null,
    envKey: "PADDLE_PRICE_IMPLEMENTATION_FOUNDATION",
    legacyEnvKeys: [] as string[],
    planKey: "founding_pilot" as const,
    kind: "implementation" as const,
  },
  {
    name: "INTERTEXE Intelligence Implementation",
    description: "Connect, configure, and launch — Intelligence implementation (migration, rules, publishing, training).",
    priceUsd: INTELLIGENCE_IMPLEMENTATION_USD,
    interval: null,
    envKey: "PADDLE_PRICE_IMPLEMENTATION_INTELLIGENCE",
    legacyEnvKeys: [] as string[],
    planKey: "founding_pilot" as const,
    kind: "implementation" as const,
  },
] as const;

async function paddleFetch<T>(pathSuffix: string, init?: RequestInit): Promise<T> {
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!key) throw new Error("Set PADDLE_API_KEY before running catalog sync.");

  const res = await fetch(`${getPaddleApiBase()}${pathSuffix}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Paddle ${res.status}: ${JSON.stringify(json)}`);
  }
  return (json.data ?? json) as T;
}

function buildCommercialSummary(
  results: Record<
    string,
    {
      productId: string;
      priceId: string;
      envKey: string;
      plan: string;
      kind: string;
      monthlyUsd?: number;
      oneTimeUsd?: number;
      maxProducts?: number;
      maxHostedPassports?: number;
      maxTeamMembers?: number;
    }
  >
) {
  const paddleByEnv = new Map(Object.entries(results).map(([, row]) => [row.envKey, row]));

  const rows: Array<Record<string, unknown>> = [
    {
      plan: "demo",
      publicName: "10-product pilot",
      label: PLAN_DEFINITIONS.demo.label,
      paddleProduct: null,
      priceId: null,
      monthlyUsd: 0,
      implementationUsd: null,
      maxProducts: PLAN_DEFINITIONS.demo.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.demo.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.demo.maxTeamMembers,
      billing: "none",
    },
    {
      plan: "professional",
      publicName: "Foundation",
      label: PLAN_DEFINITIONS.professional.label,
      paddleProduct: "INTERTEXE Foundation",
      priceId: paddleByEnv.get("PADDLE_PRICE_FOUNDATION")?.priceId ?? null,
      envKey: "PADDLE_PRICE_FOUNDATION",
      monthlyUsd: PLAN_DEFINITIONS.professional.monthlyUsd,
      implementationUsd: PLAN_DEFINITIONS.professional.implementationUsd,
      implementationPriceId: paddleByEnv.get("PADDLE_PRICE_IMPLEMENTATION_FOUNDATION")?.priceId ?? null,
      maxProducts: PLAN_DEFINITIONS.professional.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.professional.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.professional.maxTeamMembers,
      billing: "paddle",
    },
    {
      plan: "platform",
      publicName: "Intelligence",
      label: PLAN_DEFINITIONS.platform.label,
      paddleProduct: "INTERTEXE Intelligence",
      priceId: paddleByEnv.get("PADDLE_PRICE_INTELLIGENCE")?.priceId ?? null,
      envKey: "PADDLE_PRICE_INTELLIGENCE",
      monthlyUsd: PLAN_DEFINITIONS.platform.monthlyUsd,
      implementationUsd: PLAN_DEFINITIONS.platform.implementationUsd,
      implementationPriceId: paddleByEnv.get("PADDLE_PRICE_IMPLEMENTATION_INTELLIGENCE")?.priceId ?? null,
      maxProducts: PLAN_DEFINITIONS.platform.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.platform.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.platform.maxTeamMembers,
      billing: "paddle",
    },
    {
      plan: "enterprise",
      publicName: "Enterprise",
      label: PLAN_DEFINITIONS.enterprise.label,
      paddleProduct: null,
      priceId: null,
      monthlyUsd: null,
      implementationUsd: null,
      maxProducts: null,
      maxHostedPassports: null,
      maxTeamMembers: null,
      billing: "manual / invoice",
    },
  ];

  return rows;
}

async function main() {
  const env = getPaddleEnvironment();
  console.log(`Syncing Paddle catalog (${env}) → Foundation / Intelligence + tiered implementation…`);

  const results: Record<
    string,
    {
      productId: string;
      priceId: string;
      envKey: string;
      plan: string;
      kind: string;
      monthlyUsd?: number;
      oneTimeUsd?: number;
      maxProducts?: number;
      maxHostedPassports?: number;
      maxTeamMembers?: number;
    }
  > = {};

  for (const item of CATALOG) {
    const product = await paddleFetch<{ id: string }>("/products", {
      method: "POST",
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        tax_category: "standard",
        type: "standard",
      }),
    });

    const unitPrice = {
      amount: String(item.priceUsd * 100),
      currency_code: "USD",
    };

    const priceBody: Record<string, unknown> = {
      description: item.name,
      product_id: product.id,
      unit_price: unitPrice,
      quantity: { minimum: 1, maximum: 1 },
    };

    if (item.interval) {
      priceBody.billing_cycle = { interval: item.interval, frequency: 1 };
    }

    const price = await paddleFetch<{ id: string }>("/prices", {
      method: "POST",
      body: JSON.stringify(priceBody),
    });

    const def = PLAN_DEFINITIONS[item.planKey === "founding_pilot" ? "founding_pilot" : item.planKey];
    results[item.envKey] = {
      productId: product.id,
      priceId: price.id,
      envKey: item.envKey,
      plan: item.planKey,
      kind: item.kind,
      ...(item.interval
        ? { monthlyUsd: item.priceUsd }
        : { oneTimeUsd: item.priceUsd }),
      maxProducts: def.maxProducts ?? undefined,
      maxHostedPassports: def.maxHostedPassports ?? undefined,
      maxTeamMembers: def.maxTeamMembers ?? undefined,
    };

    console.log(`${item.envKey}=${price.id}  # ${item.name}`);
    for (const legacy of item.legacyEnvKeys) {
      console.log(`# optional legacy alias: ${legacy}=${price.id}`);
    }
  }

  const outDir = path.join(ROOT, "scripts/output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "paddle-catalog-ids.json");
  const commercial = buildCommercialSummary(results);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        syncedAt: new Date().toISOString(),
        environment: env,
        notes: {
          paddleBilling: "Paddle dashboard + env price IDs mapped in lib/enterprise/paddle.ts",
          publicNames: "Foundation / Intelligence / Enterprise",
          entitlementKeys: "professional / platform / enterprise",
          enterprise: "Manual / invoice — no Paddle subscription product",
        },
        commercial,
        prices: results,
        envSnippet: Object.values(results)
          .map((r) => `${r.envKey}=${r.priceId}`)
          .join("\n"),
        webhookUrl: "https://platform.intertexe.com/api/webhooks/paddle",
      },
      null,
      2
    )
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

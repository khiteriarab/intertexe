/**
 * Sync INTERTEXE Paddle sandbox catalog (products + prices).
 * Requires PADDLE_API_KEY in environment — never commit the key.
 *
 * Usage: PADDLE_API_KEY=... npx tsx scripts/sync-paddle-catalog.ts
 *
 * Writes IDs to scripts/output/paddle-catalog-ids.json (gitignored output dir ok).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLAN_DEFINITIONS } from "../lib/enterprise/plans.ts";
import { getPaddleApiBase, getPaddleEnvironment } from "../lib/enterprise/paddle.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const CATALOG = [
  {
    name: "INTERTEXE Professional",
    description:
      "Standard DPP and product passport infrastructure — up to 500 products, traceability, sustainability data, and standard API access.",
    priceUsd: 499,
    interval: "month" as const,
    envKey: "PADDLE_PRICE_PLATFORM",
    planKey: "professional" as const,
    kind: "subscription" as const,
  },
  {
    name: "INTERTEXE Platform",
    description:
      "Advanced product intelligence — up to 2,000 products, white-label passports, circularity, integrations, and advanced analytics.",
    priceUsd: 1250,
    interval: "month" as const,
    envKey: "PADDLE_PRICE_PROFESSIONAL",
    planKey: "platform" as const,
    kind: "subscription" as const,
  },
  {
    name: "INTERTEXE Implementation",
    description: "Catalog onboarding, data mapping, workspace configuration and implementation support.",
    priceUsd: 5000,
    interval: null,
    envKey: "PADDLE_PRICE_IMPLEMENTATION",
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
  const paddleByPlan = new Map(
    Object.entries(results).map(([, row]) => [row.plan, row])
  );

  const rows: Array<Record<string, unknown>> = [
    {
      plan: "demo",
      label: PLAN_DEFINITIONS.demo.label,
      paddleProduct: null,
      priceId: null,
      monthlyUsd: 0,
      implementationUsd: null,
      maxProducts: PLAN_DEFINITIONS.demo.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.demo.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.demo.maxTeamMembers,
      billing: "None — internal demo workspace",
    },
    {
      plan: "platform",
      label: PLAN_DEFINITIONS.platform.label,
      paddleProduct: "INTERTEXE Platform",
      priceId: paddleByPlan.get("platform")?.priceId ?? null,
      envKey: "PADDLE_PRICE_PLATFORM",
      monthlyUsd: PLAN_DEFINITIONS.platform.monthlyUsd,
      implementationUsd: PLAN_DEFINITIONS.platform.implementationUsd,
      maxProducts: PLAN_DEFINITIONS.platform.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.platform.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.platform.maxTeamMembers,
      billing: "Paddle subscription",
    },
    {
      plan: "professional",
      label: PLAN_DEFINITIONS.professional.label,
      paddleProduct: "INTERTEXE Professional",
      priceId: paddleByPlan.get("professional")?.priceId ?? null,
      envKey: "PADDLE_PRICE_PROFESSIONAL",
      monthlyUsd: PLAN_DEFINITIONS.professional.monthlyUsd,
      implementationUsd: PLAN_DEFINITIONS.professional.implementationUsd,
      maxProducts: PLAN_DEFINITIONS.professional.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.professional.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.professional.maxTeamMembers,
      billing: "Paddle subscription",
    },
    {
      plan: "founding_pilot",
      label: PLAN_DEFINITIONS.founding_pilot.label,
      paddleProduct: "INTERTEXE Implementation",
      priceId: paddleByPlan.get("founding_pilot")?.priceId ?? null,
      envKey: "PADDLE_PRICE_IMPLEMENTATION",
      monthlyUsd: null,
      implementationUsd: PLAN_DEFINITIONS.founding_pilot.implementationUsd,
      maxProducts: PLAN_DEFINITIONS.founding_pilot.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.founding_pilot.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.founding_pilot.maxTeamMembers,
      billing: "Paddle one-time — does not activate subscription limits alone",
    },
    {
      plan: "enterprise",
      label: PLAN_DEFINITIONS.enterprise.label,
      paddleProduct: null,
      priceId: null,
      monthlyUsd: null,
      implementationUsd: null,
      maxProducts: PLAN_DEFINITIONS.enterprise.maxProducts,
      maxHostedPassports: PLAN_DEFINITIONS.enterprise.maxHostedPassports,
      maxTeamMembers: PLAN_DEFINITIONS.enterprise.maxTeamMembers,
      billing: "Manual / invoice — set entitlements in obelisk-core",
    },
  ];

  return rows;
}

async function main() {
  console.log(`Paddle environment: ${getPaddleEnvironment()}`);
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
      note?: string;
    }
  > = {};

  for (const item of CATALOG) {
    const product = await paddleFetch<{ id: string }>("/products", {
      method: "POST",
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        tax_category: "standard",
      }),
    });

    const priceBody: Record<string, unknown> = {
      product_id: product.id,
      description: item.name,
      unit_price: {
        amount: String(item.priceUsd * 100),
        currency_code: "USD",
      },
    };
    if (item.interval) {
      priceBody.billing_cycle = { interval: item.interval, frequency: 1 };
    }

    const price = await paddleFetch<{ id: string }>("/prices", {
      method: "POST",
      body: JSON.stringify(priceBody),
    });

    const plan = PLAN_DEFINITIONS[item.planKey];
    results[item.name] = {
      productId: product.id,
      priceId: price.id,
      envKey: item.envKey,
      plan: item.planKey,
      kind: item.kind,
      maxProducts: plan.maxProducts,
      maxHostedPassports: plan.maxHostedPassports,
      maxTeamMembers: plan.maxTeamMembers,
      ...(item.kind === "subscription"
        ? { monthlyUsd: item.priceUsd }
        : {
            oneTimeUsd: item.priceUsd,
            note: "One-time fee — does not set monthly subscription limits",
          }),
    };
    console.log(`${item.name}: product=${product.id} price=${price.id}`);
  }

  const outDir = path.join(ROOT, "scripts/output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "paddle-catalog-ids.json");
  const demo = PLAN_DEFINITIONS.demo;
  const envTemplate = {
    PADDLE_ENV: getPaddleEnvironment(),
    PADDLE_API_KEY: "<server-only — Paddle dashboard>",
    PADDLE_WEBHOOK_SECRET: "<server-only — Paddle notifications>",
    PADDLE_GRACE_PERIOD_DAYS: "14",
    ...Object.fromEntries(Object.values(results).map((row) => [row.envKey, row.priceId])),
  };

  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        documentPurpose:
          "Single commercial + engineering reference: Paddle price IDs, list prices, and INTERTEXE-enforced limits.",
        sourceOfTruth: {
          entitlements: "lib/enterprise/plans.ts",
          paddleBilling: "Paddle dashboard + env price IDs mapped in lib/enterprise/paddle.ts",
          note: "Paddle stores billing only. Product/passport/team limits are enforced in obelisk-core, not in Paddle.",
        },
        syncedAt: new Date().toISOString(),
        environment: getPaddleEnvironment(),
        commercialSummary: buildCommercialSummary(results),
        results,
        demoPlan: {
          plan: "demo",
          paddleProduct: null,
          maxProducts: demo.maxProducts,
          maxHostedPassports: demo.maxHostedPassports,
          maxTeamMembers: demo.maxTeamMembers,
        },
        envTemplate,
        webhookUrl: "https://platform.intertexe.com/api/webhooks/paddle",
      },
      null,
      2
    )
  );
  console.log(`\nWrote ${outPath}`);
  console.log("\nAdd to .env.enterprise.local (server-side only):");
  for (const row of Object.values(results)) {
    console.log(`${row.envKey}=${row.priceId}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

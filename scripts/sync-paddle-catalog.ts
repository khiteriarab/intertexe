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
    name: "INTERTEXE Platform",
    description:
      "Product and material intelligence infrastructure for fashion brands, with managed product records, hosted product identities and Digital Product Passport workflows.",
    priceUsd: 499,
    interval: "month" as const,
    envKey: "PADDLE_PRICE_PLATFORM",
    planKey: "platform" as const,
    kind: "subscription" as const,
  },
  {
    name: "INTERTEXE Professional",
    description:
      "Expanded product intelligence infrastructure for growing fashion brands, with higher catalog capacity, advanced workflows and branded product experiences.",
    priceUsd: 1250,
    interval: "month" as const,
    envKey: "PADDLE_PRICE_PROFESSIONAL",
    planKey: "professional" as const,
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

async function main() {
  console.log(`Paddle environment: ${getPaddleEnvironment()}`);
  const results: Record<string, { productId: string; priceId: string; envKey: string }> = {};

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
      ...(item.kind === "subscription"
        ? {
            monthlyUsd: item.priceUsd,
            maxProducts: plan.maxProducts,
            maxHostedPassports: plan.maxHostedPassports,
          }
        : { oneTimeUsd: item.priceUsd, note: "One-time fee — does not set monthly subscription limits" }),
    };
    console.log(`${item.name}: product=${product.id} price=${price.id}`);
  }

  const outDir = path.join(ROOT, "scripts/output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "paddle-catalog-ids.json");
  const demo = PLAN_DEFINITIONS.demo;
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        syncedAt: new Date().toISOString(),
        environment: getPaddleEnvironment(),
        note: "Entitlements are enforced in obelisk-core (lib/enterprise/plans.ts), not in Paddle.",
        results,
        demoPlan: {
          plan: "demo",
          paddleProduct: null,
          maxProducts: demo.maxProducts,
          maxHostedPassports: demo.maxHostedPassports,
        },
        envTemplate: Object.fromEntries(
          Object.values(results).map((row) => [row.envKey, row.priceId])
        ),
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

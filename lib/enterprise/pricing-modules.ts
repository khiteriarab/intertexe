/**
 * Modular licence catalogue for the public pricing configurator.
 *
 * Amounts are annual starting figures in EUR and are the single source of truth for
 * both the marketing page and Paddle checkout. Paddle stores billing only — product,
 * passport and team limits stay enforced in obelisk-core.
 */

export type PricingModuleKey =
  | "product_intelligence"
  | "traceability_compliance"
  | "environmental_intelligence"
  | "digital_product_passport"
  | "connected_lifecycle"
  | "supplier_scorecards";

export type PricingModule = {
  key: PricingModuleKey;
  name: string;
  summary: string;
  /** Annual starting price in EUR, or null when the module is scoped in a written proposal. */
  startingEur: number | null;
  /** Env var holding the Paddle price ID for this module. */
  paddlePriceEnv: string;
};

export const PRICING_MODULES: PricingModule[] = [
  {
    key: "product_intelligence",
    name: "Product Intelligence",
    summary: "Materials, composition, suppliers and one governed record",
    startingEur: 3_000,
    paddlePriceEnv: "PADDLE_PRICE_MODULE_PRODUCT_INTELLIGENCE",
  },
  {
    key: "traceability_compliance",
    name: "Traceability + Compliance",
    summary: "Supply-chain evidence, readiness and regulatory preparation",
    startingEur: 5_000,
    paddlePriceEnv: "PADDLE_PRICE_MODULE_TRACEABILITY",
  },
  {
    key: "environmental_intelligence",
    name: "Environmental Intelligence",
    summary: "Product impact, environmental cost and material benchmarks",
    startingEur: 5_000,
    paddlePriceEnv: "PADDLE_PRICE_MODULE_ENVIRONMENTAL",
  },
  {
    key: "digital_product_passport",
    name: "Digital Product Passport",
    summary: "Identity, publication engine and hosted or white-label delivery",
    startingEur: 3_000,
    paddlePriceEnv: "PADDLE_PRICE_MODULE_DPP",
  },
  {
    key: "connected_lifecycle",
    name: "Connected Product Lifecycle",
    summary: "Care, repair, resale and ownership transfer after the first sale",
    startingEur: null,
    paddlePriceEnv: "PADDLE_PRICE_MODULE_LIFECYCLE",
  },
  {
    key: "supplier_scorecards",
    name: "Supplier Data + Scorecards",
    summary: "Collect and score supplier data across every tier",
    startingEur: 3_000,
    paddlePriceEnv: "PADDLE_PRICE_MODULE_SUPPLIER",
  },
];

export const PRICING_MODULE_KEYS = PRICING_MODULES.map((m) => m.key);

export function pricingModuleByKey(key: string): PricingModule | null {
  return PRICING_MODULES.find((m) => m.key === key) ?? null;
}

export function formatEur(amount: number): string {
  return `€${amount.toLocaleString("en-US")}`;
}

export type ModuleEstimate = {
  /** Modules with a published starting figure. */
  pricedKeys: PricingModuleKey[];
  /** Selected modules scoped in a proposal instead of priced. */
  customKeys: PricingModuleKey[];
  /** Sum of the priced starting figures, in EUR. */
  totalEur: number;
  /** True when at least one selection needs a written proposal. */
  requiresProposal: boolean;
};

export function estimateModules(keys: readonly string[]): ModuleEstimate {
  const selected = keys
    .map((key) => pricingModuleByKey(key))
    .filter((m): m is PricingModule => Boolean(m));

  const pricedKeys: PricingModuleKey[] = [];
  const customKeys: PricingModuleKey[] = [];
  let totalEur = 0;

  for (const mod of selected) {
    if (typeof mod.startingEur === "number") {
      pricedKeys.push(mod.key);
      totalEur += mod.startingEur;
    } else {
      customKeys.push(mod.key);
    }
  }

  return { pricedKeys, customKeys, totalEur, requiresProposal: customKeys.length > 0 };
}

/** Paddle price ID for a module, when the environment has one configured. */
export function paddlePriceIdForModule(key: string): string | null {
  const mod = pricingModuleByKey(key);
  if (!mod) return null;
  const direct = process.env[mod.paddlePriceEnv]?.trim();
  if (direct) return direct;

  try {
    const raw = process.env.PADDLE_PRICE_MODULE_MAP_JSON;
    if (raw) {
      const map = JSON.parse(raw) as Record<string, string>;
      const mapped = map[mod.key]?.trim();
      if (mapped) return mapped;
    }
  } catch {
    /* ignore malformed JSON */
  }
  return null;
}

/** True when every priced selection can be taken straight to Paddle checkout. */
export function modulesAreCheckoutReady(keys: readonly string[]): boolean {
  const { pricedKeys, requiresProposal } = estimateModules(keys);
  if (!pricedKeys.length || requiresProposal) return false;
  return pricedKeys.every((key) => Boolean(paddlePriceIdForModule(key)));
}

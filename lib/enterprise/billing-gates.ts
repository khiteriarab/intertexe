import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canAddProducts,
  canPublishNewPassport,
  entitlementsForPlan,
  getOrganizationEntitlements,
  checkUsageAllowance,
  type EntitlementSnapshot,
  type PlanKey,
} from "./entitlements";
import {
  billingAllowsNewResources,
  billingPreservesPublicPassports,
  isOverLimit,
  usageAllowanceMessage,
  type BillingAccountRow,
} from "./billing-lifecycle";
import { incrementUsageMeter, loadUsageMeters } from "./usage-meters";
import {
  checkoutPricesForPlan,
  defaultCheckoutPriceForPlan,
  isPaddleConfigured,
} from "./paddle";
import { normalizePlanKey, planDefinition } from "./plans";
import { upgradeHintForPlan } from "./pricing";

export type BillingDashboard = {
  plan: PlanKey;
  planLabel: string;
  productAllowance: number | null;
  passportAllowance: number | null;
  entitlements: EntitlementSnapshot;
  meters: Array<{ key: string; used: number; limit: number | null; overLimit: boolean }>;
  publishedPassportCount: number;
  activeProductCount: number;
  canPublish: boolean;
  publishBlockReason?: string;
  billingStatus: string;
  billingProvider: string | null;
  gracePeriodUntil: string | null;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  overLimitProducts: boolean;
  overLimitPassports: boolean;
  billingAccount: {
    contract_value: number | null;
    invoice_status: string | null;
    amount_outstanding: number | null;
    renewal_date: string | null;
    cancellation_state: string | null;
    billing_status?: string | null;
    billing_provider?: string | null;
    grace_period_until?: string | null;
    cancel_at_period_end?: boolean | null;
    billing_price_id?: string | null;
    paddle_customer_id?: string | null;
    paddle_subscription_id?: string | null;
  } | null;
  paddleCheckoutAvailable: boolean;
  upgradePriceId: string | null;
  checkoutPrices: ReturnType<typeof checkoutPricesForPlan>;
};

export async function loadOrgEntitlements(
  client: SupabaseClient,
  organizationId: string
): Promise<EntitlementSnapshot> {
  const { data: org } = await client
    .from("organizations")
    .select("plan, product_allowance, passport_allowance")
    .eq("id", organizationId)
    .maybeSingle();

  const plan = normalizePlanKey(org?.plan || "demo") as PlanKey;
  return getOrganizationEntitlements({
    plan,
    productAllowance: org?.product_allowance ?? undefined,
    passportAllowance: org?.passport_allowance ?? undefined,
  });
}

/** Count distinct products with an active published passport (v1/v2/v3 = one allowance). */
export async function countPublishedPassports(
  client: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { data } = await client
    .from("passports")
    .select("product_id")
    .eq("organization_id", organizationId)
    .in("state", ["published", "update_required"]);

  const unique = new Set((data || []).map((row) => row.product_id).filter(Boolean));
  return unique.size;
}

export async function countActiveProducts(
  client: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count } = await client
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .neq("lifecycle_state", "archived");
  return count || 0;
}

export type PublishGateResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: "plan" | "allowance" | "entitlement" | "billing" };

export type ProductGateResult =
  | { allowed: true; remaining: number | null; overLimit?: boolean }
  | { allowed: false; reason: string; code: "plan" | "allowance" | "billing"; overLimit?: boolean };

async function loadBillingAccount(
  client: SupabaseClient,
  organizationId: string
): Promise<BillingAccountRow | null> {
  const { data } = await client
    .from("billing_accounts")
    .select(
      "billing_status, grace_period_until, cancel_at_period_end, billing_provider, renewal_date, invoice_status, cancellation_state, contract_value, amount_outstanding, billing_price_id, paddle_customer_id, paddle_subscription_id"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

/** Enforce product catalog allowance before import or manual create. */
export async function assertCanAddProducts(
  client: SupabaseClient,
  organizationId: string,
  additional = 1
): Promise<ProductGateResult> {
  const [entitlements, activeProductCount, billing] = await Promise.all([
    loadOrgEntitlements(client, organizationId),
    countActiveProducts(client, organizationId),
    loadBillingAccount(client, organizationId),
  ]);

  if (!billingAllowsNewResources(billing)) {
    return {
      allowed: false,
      code: "billing",
      reason: "Billing action required — subscription is restricted. Contact your workspace owner.",
    };
  }

  const usage = checkUsageAllowance(entitlements, "products", activeProductCount, additional);
  if (!usage.allowed) {
    const overMsg = usageAllowanceMessage("products", activeProductCount, entitlements.productAllowance, usage.overLimit);
    return {
      allowed: false,
      code: usage.overLimit ? "allowance" : "allowance",
      overLimit: usage.overLimit,
      reason: overMsg || `Product allowance reached. ${upgradeHintForPlan(entitlements.plan)}`,
    };
  }
  return { allowed: true, remaining: usage.remaining, overLimit: false };
}

export async function recordProductsImported(
  client: SupabaseClient,
  organizationId: string,
  newProducts: number
): Promise<void> {
  if (newProducts <= 0) return;
  await incrementUsageMeter(client, organizationId, "products_active", newProducts);
}

/** Enforce plan + passport allowance before publish (Phase B billing gate). */
export async function assertCanPublishPassport(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<PublishGateResult> {
  const [entitlements, billing] = await Promise.all([
    loadOrgEntitlements(client, organizationId),
    loadBillingAccount(client, organizationId),
  ]);

  if (!billingAllowsNewResources(billing) && !billingPreservesPublicPassports(billing)) {
    return {
      allowed: false,
      code: "billing",
      reason: "Billing action required before publishing new passports.",
    };
  }

  if (!entitlements.canPublishPassports) {
    return {
      allowed: false,
      code: "plan",
      reason: upgradeHintForPlan(entitlements.plan),
    };
  }

  const { data: existingPassport } = await client
    .from("passports")
    .select("state")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .maybeSingle();

  const alreadyPublished =
    existingPassport?.state === "published" || existingPassport?.state === "update_required";

  if (!alreadyPublished) {
    if (!billingAllowsNewResources(billing)) {
      return {
        allowed: false,
        code: "billing",
        reason: "New passport publishing is paused while billing is restricted. Existing public passports remain available.",
      };
    }

    const publishedCount = await countPublishedPassports(client, organizationId);
    if (
      !canPublishNewPassport(entitlements, publishedCount, false)
    ) {
      const usage = checkUsageAllowance(entitlements, "hosted_passports", publishedCount, 1);
      return {
        allowed: false,
        code: "allowance",
        reason:
          usageAllowanceMessage("hosted_passports", publishedCount, entitlements.passportAllowance, usage.overLimit) ||
          upgradeHintForPlan(entitlements.plan),
      };
    }
  }

  return { allowed: true };
}

/** Increment usage meter on first publish only (republish does not consume allowance). */
export async function recordPassportPublished(
  client: SupabaseClient,
  organizationId: string,
  isFirstPublish: boolean
): Promise<void> {
  if (!isFirstPublish) return;
  await incrementUsageMeter(client, organizationId, "passports_published", 1);
}

export async function loadBillingDashboard(
  client: SupabaseClient,
  organizationId: string
): Promise<BillingDashboard> {
  const [entitlements, meters, publishedPassportCount, activeProductCount, billingRes, orgRes] =
    await Promise.all([
      loadOrgEntitlements(client, organizationId),
      loadUsageMeters(client, organizationId),
      countPublishedPassports(client, organizationId),
      countActiveProducts(client, organizationId),
      client
        .from("billing_accounts")
        .select(
          "contract_value, invoice_status, amount_outstanding, renewal_date, cancellation_state, billing_status, billing_provider, grace_period_until, cancel_at_period_end, billing_price_id, paddle_customer_id, paddle_subscription_id"
        )
        .eq("organization_id", organizationId)
        .maybeSingle(),
      client
        .from("organizations")
        .select("plan, product_allowance, passport_allowance")
        .eq("id", organizationId)
        .maybeSingle(),
    ]);

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  const period = periodStart.toISOString().slice(0, 10);

  const meterMap = new Map(
    meters.map((m) => [`${m.metric_key}:${m.period_start}`, Number(m.value || 0)])
  );
  const passportsMeter = meterMap.get(`passports_published:${period}`) ?? publishedPassportCount;
  const productsMeter = meterMap.get(`products_active:${period}`) ?? activeProductCount;

  const productAllowance = orgRes.data?.product_allowance ?? entitlements.productAllowance;
  const passportAllowance = orgRes.data?.passport_allowance ?? entitlements.passportAllowance;
  const overLimitProducts = isOverLimit(activeProductCount, productAllowance);
  const overLimitPassports = isOverLimit(publishedPassportCount, passportAllowance);

  const canPublish =
    entitlements.canPublishPassports &&
    billingAllowsNewResources(billingRes.data) &&
    (passportAllowance == null || publishedPassportCount < passportAllowance || overLimitPassports);

  let publishBlockReason: string | undefined;
  if (!entitlements.canPublishPassports) {
    publishBlockReason = upgradeHintForPlan(entitlements.plan);
  } else if (!billingAllowsNewResources(billingRes.data)) {
    publishBlockReason = "New passport publishing paused — resolve billing in Settings.";
  } else if (overLimitPassports) {
    publishBlockReason = usageAllowanceMessage(
      "hosted_passports",
      publishedPassportCount,
      passportAllowance,
      true
    )!;
  } else if (passportAllowance != null && publishedPassportCount >= passportAllowance) {
    publishBlockReason = `Passport allowance reached (${publishedPassportCount}/${passportAllowance}). ${upgradeHintForPlan(entitlements.plan)}`;
  }

  const plan = entitlements.plan;

  return {
    plan,
    planLabel: planDefinition(plan).label,
    productAllowance,
    passportAllowance,
    entitlements,
    publishedPassportCount,
    activeProductCount,
    canPublish,
    publishBlockReason,
    billingStatus: billingRes.data?.billing_status || "none",
    billingProvider: billingRes.data?.billing_provider || planDefinition(plan).billingProvider,
    gracePeriodUntil: billingRes.data?.grace_period_until || null,
    renewalDate: billingRes.data?.renewal_date || null,
    cancelAtPeriodEnd: Boolean(billingRes.data?.cancel_at_period_end),
    overLimitProducts,
    overLimitPassports,
    meters: [
      {
        key: "products",
        used: Math.max(activeProductCount, productsMeter),
        limit: productAllowance,
        overLimit: overLimitProducts,
      },
      {
        key: "hosted_passports",
        used: Math.max(publishedPassportCount, passportsMeter),
        limit: passportAllowance,
        overLimit: overLimitPassports,
      },
    ],
    billingAccount: billingRes.data || null,
    paddleCheckoutAvailable: isPaddleConfigured(),
    upgradePriceId: defaultCheckoutPriceForPlan(plan),
    checkoutPrices: checkoutPricesForPlan(plan),
  };
}

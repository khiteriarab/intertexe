import type { SupabaseClient } from "@supabase/supabase-js";
import {
  entitlementsForPlan,
  type EntitlementSnapshot,
  type PlanKey,
} from "./entitlements";
import { incrementUsageMeter, loadUsageMeters } from "./usage-meters";

export type BillingDashboard = {
  plan: PlanKey;
  productAllowance: number | null;
  passportAllowance: number | null;
  entitlements: EntitlementSnapshot;
  meters: Array<{ key: string; used: number; limit: number | null }>;
  publishedPassportCount: number;
  activeProductCount: number;
  canPublish: boolean;
  publishBlockReason?: string;
  billingAccount: {
    contract_value: number | null;
    invoice_status: string | null;
    amount_outstanding: number | null;
    renewal_date: string | null;
    cancellation_state: string | null;
    stripe_customer_id?: string | null;
    plan_key?: string | null;
  } | null;
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

  const plan = (org?.plan || "free_snapshot") as PlanKey;
  return entitlementsForPlan(plan, {
    productAllowance: org?.product_allowance ?? undefined,
    passportAllowance: org?.passport_allowance ?? undefined,
  });
}

export async function countPublishedPassports(
  client: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count } = await client
    .from("passports")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("state", ["published", "update_required"]);
  return count || 0;
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
  | { allowed: false; reason: string; code: "plan" | "allowance" | "entitlement" };

/** Enforce plan + passport allowance before publish (Phase B billing gate). */
export async function assertCanPublishPassport(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<PublishGateResult> {
  const entitlements = await loadOrgEntitlements(client, organizationId);
  if (!entitlements.canPublishPassports) {
    return {
      allowed: false,
      code: "plan",
      reason: "Your plan does not include passport publishing. Upgrade to Founding Pilot or SaaS.",
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

  if (!alreadyPublished && entitlements.passportAllowance != null) {
    const publishedCount = await countPublishedPassports(client, organizationId);
    if (publishedCount >= entitlements.passportAllowance) {
      return {
        allowed: false,
        code: "allowance",
        reason: `Passport allowance reached (${publishedCount}/${entitlements.passportAllowance}). Contact INTERTEXE to increase your limit.`,
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
          "contract_value, invoice_status, amount_outstanding, renewal_date, cancellation_state, stripe_customer_id, plan_key"
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

  const canPublish =
    entitlements.canPublishPassports &&
    (entitlements.passportAllowance == null ||
      publishedPassportCount < entitlements.passportAllowance);

  let publishBlockReason: string | undefined;
  if (!entitlements.canPublishPassports) {
    publishBlockReason =
      "Your plan does not include passport publishing. Upgrade to Founding Pilot or SaaS.";
  } else if (
    entitlements.passportAllowance != null &&
    publishedPassportCount >= entitlements.passportAllowance
  ) {
    publishBlockReason = `Passport allowance reached (${publishedPassportCount}/${entitlements.passportAllowance}).`;
  }

  return {
    plan: entitlements.plan,
    productAllowance: orgRes.data?.product_allowance ?? entitlements.productAllowance,
    passportAllowance: orgRes.data?.passport_allowance ?? entitlements.passportAllowance,
    entitlements,
    publishedPassportCount,
    activeProductCount,
    canPublish,
    publishBlockReason,
    meters: [
      {
        key: "passports_published",
        used: Math.max(publishedPassportCount, passportsMeter),
        limit: entitlements.passportAllowance,
      },
      {
        key: "products_active",
        used: Math.max(activeProductCount, productsMeter),
        limit: entitlements.productAllowance,
      },
    ],
    billingAccount: billingRes.data || null,
  };
}

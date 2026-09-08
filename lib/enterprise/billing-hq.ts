import type { SupabaseClient } from "@supabase/supabase-js";
import { entitlementsForPlan, type PlanKey } from "./entitlements";
import { countActiveProducts, countPublishedPassports } from "./billing-gates";

export type HqBillingOrgRow = {
  organizationId: string;
  slug: string;
  name: string;
  plan: string;
  publishedPassports: number;
  passportAllowance: number | null;
  activeProducts: number;
  productAllowance: number | null;
  invoiceStatus: string | null;
  contractValue: number | null;
  atPassportLimit: boolean;
  atProductLimit: boolean;
  unpaidWithPublish: boolean;
};

export type HqBillingOverview = {
  organizationCount: number;
  mrrEstimate: number;
  arrEstimate: number;
  unpaidActivePublish: number;
  atPassportLimit: HqBillingOrgRow[];
  atProductLimit: HqBillingOrgRow[];
  unpaidWithPublish: HqBillingOrgRow[];
};

function normalizeMrr(contractValue: number | null, billingPeriod: string | null): number {
  if (contractValue == null || !Number.isFinite(Number(contractValue))) return 0;
  const v = Number(contractValue);
  const period = String(billingPeriod || "annual").toLowerCase();
  if (period.includes("month")) return v;
  if (period.includes("annual") || period.includes("year")) return v / 12;
  return v / 12;
}

export async function loadHqBillingOverview(
  client: SupabaseClient,
  limit = 50
): Promise<HqBillingOverview> {
  const { data: orgs } = await client
    .from("organizations")
    .select("id, slug, name, plan, product_allowance, passport_allowance")
    .neq("kind", "internal")
    .order("created_at", { ascending: false })
    .limit(200);

  const orgIds = (orgs || []).map((o) => o.id);
  const { data: billingRows } = orgIds.length
    ? await client
        .from("billing_accounts")
        .select(
          "organization_id, contract_value, billing_period, invoice_status, amount_outstanding, paddle_subscription_id"
        )
        .in("organization_id", orgIds)
    : { data: [] };

  const billingByOrg = new Map((billingRows || []).map((b) => [b.organization_id, b]));
  const rows: HqBillingOrgRow[] = [];

  for (const org of orgs || []) {
    const entitlements = entitlementsForPlan(org.plan as PlanKey, {
      productAllowance: org.product_allowance,
      passportAllowance: org.passport_allowance,
    });
    const [publishedPassports, activeProducts] = await Promise.all([
      countPublishedPassports(client, org.id),
      countActiveProducts(client, org.id),
    ]);
    const billing = billingByOrg.get(org.id);
    const passportAllowance = entitlements.passportAllowance;
    const productAllowance = entitlements.productAllowance;
    const atPassportLimit =
      passportAllowance != null && publishedPassports >= passportAllowance;
    const atProductLimit = productAllowance != null && activeProducts >= productAllowance;
    const unpaidWithPublish =
      publishedPassports > 0 &&
      Boolean(billing?.invoice_status && billing.invoice_status !== "paid");

    rows.push({
      organizationId: org.id,
      slug: org.slug,
      name: org.name,
      plan: org.plan,
      publishedPassports,
      passportAllowance,
      activeProducts,
      productAllowance,
      invoiceStatus: billing?.invoice_status || null,
      contractValue: billing?.contract_value != null ? Number(billing.contract_value) : null,
      atPassportLimit,
      atProductLimit,
      unpaidWithPublish,
    });
  }

  let mrrEstimate = 0;
  for (const b of billingRows || []) {
    mrrEstimate += normalizeMrr(
      b.contract_value != null ? Number(b.contract_value) : null,
      b.billing_period
    );
  }

  return {
    organizationCount: rows.length,
    mrrEstimate: Math.round(mrrEstimate * 100) / 100,
    arrEstimate: Math.round(mrrEstimate * 12 * 100) / 100,
    unpaidActivePublish: rows.filter((r) => r.unpaidWithPublish).length,
    atPassportLimit: rows.filter((r) => r.atPassportLimit).slice(0, limit),
    atProductLimit: rows.filter((r) => r.atProductLimit).slice(0, limit),
    unpaidWithPublish: rows.filter((r) => r.unpaidWithPublish).slice(0, limit),
  };
}

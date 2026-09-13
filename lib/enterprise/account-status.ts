import type { PlanKey } from "./entitlements";
import { isPaidSubscriptionPlan, isPilotPlan } from "./pricing";

export type CommercialAccountStatus =
  | "lead"
  | "pilot"
  | "active"
  | "past_due"
  | "canceled"
  | "enterprise_sales";

export type AccountStatusInput = {
  plan: PlanKey | string;
  accountState?: string | null;
  billingStatus?: string | null;
};

/** Unified commercial status for org workspaces (customer SaaS — not founder HQ). */
export function resolveCommercialAccountStatus(input: AccountStatusInput): CommercialAccountStatus {
  const plan = String(input.plan || "demo");
  const billing = String(input.billingStatus || "none").toLowerCase();
  const account = String(input.accountState || "active").toLowerCase();

  if (plan === "enterprise" || plan === "internal") return "enterprise_sales";
  if (billing === "past_due") return "past_due";
  if (billing === "canceled") return "canceled";
  if (isPaidSubscriptionPlan(plan) && (billing === "active" || billing === "none")) return "active";
  if (isPilotPlan(plan) || plan === "founding_pilot") return "pilot";
  if (account === "invited") return "lead";
  return "pilot";
}

export function commercialStatusLabel(status: CommercialAccountStatus): string {
  switch (status) {
    case "lead":
      return "Lead";
    case "pilot":
      return "10-product pilot";
    case "active":
      return "Active subscription";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "enterprise_sales":
      return "Enterprise";
  }
}

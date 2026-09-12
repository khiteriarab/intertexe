import type { SupabaseClient } from "@supabase/supabase-js";
import { billingGracePeriodDays, type BillingStatus } from "./plans";

export type BillingAccountRow = {
  billing_status?: string | null;
  grace_period_until?: string | null;
  cancel_at_period_end?: boolean | null;
  billing_provider?: string | null;
};

/** Whether org can create new billable resources (products / first-time passport publish). */
export function billingAllowsNewResources(account: BillingAccountRow | null | undefined): boolean {
  const status = (account?.billing_status || "none") as BillingStatus;
  if (status === "restricted" || status === "canceled" || status === "paused") return false;
  if (status === "grace_period" || status === "past_due") {
    const until = account?.grace_period_until ? Date.parse(account.grace_period_until) : NaN;
    if (Number.isFinite(until) && Date.now() > until) return false;
  }
  return true;
}

/** Public passports stay accessible during grace/restricted — only block new paid-resource creation. */
export function billingPreservesPublicPassports(_account: BillingAccountRow | null | undefined): boolean {
  return true;
}

export function gracePeriodEnd(from = new Date()): string {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + billingGracePeriodDays());
  return end.toISOString();
}

export async function recordBillingAudit(
  client: SupabaseClient,
  organizationId: string,
  eventKind: string,
  summary: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await client.from("billing_audit_events").insert({
    organization_id: organizationId,
    event_kind: eventKind,
    summary,
    metadata,
  });
}

export function isOverLimit(used: number, limit: number | null): boolean {
  if (limit == null) return false;
  return used > limit;
}

export function usageAllowanceMessage(
  resource: "products" | "hosted_passports",
  used: number,
  limit: number | null,
  overLimit: boolean
): string | null {
  if (limit == null) return null;
  if (overLimit) {
    return `${resource === "products" ? "Products" : "Hosted passports"} over plan limit (${used}/${limit}). Existing records preserved — reduce usage or upgrade.`;
  }
  if (used >= limit) {
    return `${resource === "products" ? "Product" : "Hosted passport"} allowance reached (${used}/${limit}).`;
  }
  return null;
}

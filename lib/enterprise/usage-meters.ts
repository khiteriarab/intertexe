import type { SupabaseClient } from "@supabase/supabase-js";

export type UsageMetricKey =
  | "products_active"
  | "passports_published"
  | "imports_completed"
  | "api_calls"
  | "storage_bytes";

export async function incrementUsageMeter(
  client: SupabaseClient,
  organizationId: string,
  metricKey: UsageMetricKey,
  delta = 1
) {
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const period = periodStart.toISOString().slice(0, 10);

  const { data: existing } = await client
    .from("usage_meters")
    .select("id, value")
    .eq("organization_id", organizationId)
    .eq("metric_key", metricKey)
    .eq("period_start", period)
    .maybeSingle();

  if (existing?.id) {
    await client
      .from("usage_meters")
      .update({ value: Number(existing.value || 0) + delta })
      .eq("id", existing.id);
  } else {
    await client.from("usage_meters").insert({
      organization_id: organizationId,
      metric_key: metricKey,
      period_start: period,
      value: delta,
    });
  }
}

export async function loadUsageMeters(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("usage_meters")
    .select("metric_key, period_start, value")
    .eq("organization_id", organizationId)
    .order("period_start", { ascending: false })
    .limit(50);
  return data || [];
}

export async function loadBillingSummary(client: SupabaseClient, organizationId: string) {
  const [{ data: org }, { data: billing }] = await Promise.all([
    client.from("organizations").select("plan, product_allowance, passport_allowance").eq("id", organizationId).maybeSingle(),
    client.from("billing_accounts").select("contract_value, invoice_status, amount_invoiced, amount_collected, amount_outstanding, billing_period, renewal_date, cancellation_state").eq("organization_id", organizationId).maybeSingle(),
  ]);
  const meters = await loadUsageMeters(client, organizationId);
  return { organization: org, billing: billing || null, meters };
}

import { getEnterpriseServiceClient } from "./client";

export type OrgOverviewData = {
  backendLinked: boolean;
  productCount: number;
  issueCount: number;
  missingCount: number;
  passportCounts: Record<string, number>;
  recentActivity: Array<{ id: string; title: string; created_at: string }>;
};

export async function loadOrgOverview(organizationId: string): Promise<OrgOverviewData> {
  const empty: OrgOverviewData = {
    backendLinked: false,
    productCount: 0,
    issueCount: 0,
    missingCount: 0,
    passportCounts: {},
    recentActivity: [],
  };
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return empty;

  const [products, issues, missing, passports, activity] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("missing_data_register")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase.from("passports").select("state").eq("organization_id", organizationId),
    supabase
      .from("activity_events")
      .select("id, title, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const passportCounts: Record<string, number> = {};
  for (const row of passports.data || []) {
    const state = String((row as { state?: string }).state || "unknown");
    passportCounts[state] = (passportCounts[state] || 0) + 1;
  }

  return {
    backendLinked: true,
    productCount: products.count || 0,
    issueCount: issues.count || 0,
    missingCount: missing.count || 0,
    passportCounts,
    recentActivity: (activity.data || []) as OrgOverviewData["recentActivity"],
  };
}

export async function loadOrgProducts(organizationId: string, limit = 50) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, style_code, category, data_completeness, passport_state, last_updated_at")
    .eq("organization_id", organizationId)
    .order("last_updated_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function loadOrgProduct(organizationId: string, productId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .maybeSingle();
  if (!product) return null;
  const [fields, issues, identifiers, sourceRecords] = await Promise.all([
    supabase
      .from("normalized_fields")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("field_key"),
    supabase.from("issues").select("*").eq("organization_id", organizationId).eq("product_id", productId),
    supabase
      .from("product_identifiers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    supabase
      .from("source_records")
      .select("id, source_system, source_url, retrieved_at, created_at, payload_hash")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
  ]);
  return {
    product,
    fields: fields.data || [],
    issues: issues.data || [],
    identifiers: identifiers.data || [],
    sourceRecords: sourceRecords.data || [],
  };
}

export async function loadOrgIssues(organizationId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("issues")
    .select("id, issue_type, severity, title, status, original_value, interpreted_value, created_at, product_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data || [];
}

export async function loadOrgPassports(organizationId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return [];
  const [{ data: passports }, { data: carriers }] = await Promise.all([
    supabase
      .from("passports")
      .select("id, public_id, state, product_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("data_carriers")
      .select("passport_id, public_url, carrier_type")
      .eq("organization_id", organizationId),
  ]);
  const urlByPassport = new Map<string, string>();
  for (const row of carriers || []) {
    if (row.passport_id && row.public_url && !urlByPassport.has(row.passport_id)) {
      urlByPassport.set(row.passport_id, row.public_url);
    }
  }
  return (passports || []).map((passport) => ({
    ...passport,
    publicUrl: urlByPassport.get(passport.id) || `/p/${passport.public_id}`,
  }));
}

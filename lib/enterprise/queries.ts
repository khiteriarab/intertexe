import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIdentifierIssueDetail, type IdentifierIssueDetail } from "./identity-reconciliation";
import {
  formatOperatorTime,
  loadOrgMemberDirectory,
  reviewerFromDirectory,
  type ReviewerIdentity,
} from "./reviewer-display";

export type OrgOverviewData = {
  backendLinked: boolean;
  productCount: number;
  issueCount: number;
  missingCount: number;
  readyCount: number;
  publishedCount: number;
  updateRequiredCount: number;
  passportCounts: Record<string, number>;
  productStateCounts: Record<string, number>;
  recentActivity: Array<{ id: string; title: string; created_at: string }>;
};

function sanitizeSearch(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/[%_,]/g, "")
    .slice(0, 80);
}

export async function loadOrgOverview(
  client: SupabaseClient,
  organizationId: string
): Promise<OrgOverviewData> {
  const empty: OrgOverviewData = {
    backendLinked: false,
    productCount: 0,
    issueCount: 0,
    missingCount: 0,
    readyCount: 0,
    publishedCount: 0,
    updateRequiredCount: 0,
    passportCounts: {},
    productStateCounts: {},
    recentActivity: [],
  };
  if (!client) return empty;

  const [products, issues, missing, passports, activity, productStates] = await Promise.all([
    client
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
    client
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    client
      .from("missing_data_register")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    client.from("passports").select("state").eq("organization_id", organizationId),
    client
      .from("activity_events")
      .select("id, title, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
    client
      .from("products")
      .select("passport_state")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
  ]);

  const passportCounts: Record<string, number> = {};
  for (const row of passports.data || []) {
    const state = String((row as { state?: string }).state || "unknown");
    passportCounts[state] = (passportCounts[state] || 0) + 1;
  }
  const productStateCounts: Record<string, number> = {};
  for (const row of productStates.data || []) {
    const state = String((row as { passport_state?: string }).passport_state || "incomplete");
    productStateCounts[state] = (productStateCounts[state] || 0) + 1;
  }

  return {
    backendLinked: true,
    productCount: products.count || 0,
    issueCount: issues.count || 0,
    missingCount: missing.count || 0,
    readyCount: productStateCounts.ready || 0,
    publishedCount: productStateCounts.published || 0,
    updateRequiredCount: productStateCounts.update_required || 0,
    passportCounts,
    productStateCounts,
    recentActivity: (activity.data || []) as OrgOverviewData["recentActivity"],
  };
}

export type CatalogProductRow = {
  id: string;
  name: string;
  sku: string | null;
  style_code: string | null;
  category: string | null;
  data_completeness: number | null;
  passport_state: string | null;
  last_updated_at: string;
  gtin: string | null;
  variant: string | null;
  composition: string | null;
  openIssueCount: number;
  blockingIssueCount: number;
};

export async function loadOrgProducts(
  client: SupabaseClient,
  organizationId: string,
  filters: { q?: string; passportState?: string; page?: number; pageSize?: number } = {}
): Promise<{ rows: CatalogProductRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(filters.pageSize || 50, 1), 200);
  const page = Math.max(filters.page || 1, 1);
  const q = sanitizeSearch(filters.q);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("products")
    .select("id, name, sku, style_code, category, data_completeness, passport_state, last_updated_at", {
      count: "exact",
    })
    .eq("organization_id", organizationId)
    .eq("lifecycle", "active")
    .order("last_updated_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,style_code.ilike.%${q}%`);
  }
  if (filters.passportState) {
    query = query.eq("passport_state", filters.passportState);
  }

  const { data, count } = await query;
  const rows = data || [];
  const ids = rows.map((row) => row.id);
  if (!ids.length) {
    return { rows: [], total: count || 0, page, pageSize };
  }

  const [identifiers, issues, fields, variants] = await Promise.all([
    client
      .from("product_identifiers")
      .select("product_id, identifier_value")
      .eq("organization_id", organizationId)
      .eq("identifier_type", "gtin")
      .eq("active", true)
      .in("product_id", ids),
    client
      .from("issues")
      .select("product_id, severity, status")
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .in("product_id", ids),
    client
      .from("normalized_fields")
      .select("product_id, normalized_value")
      .eq("organization_id", organizationId)
      .eq("field_key", "composition")
      .in("product_id", ids),
    client
      .from("variants")
      .select("product_id, name, sku")
      .eq("organization_id", organizationId)
      .in("product_id", ids),
  ]);

  const gtinByProduct = new Map<string, string>();
  for (const row of identifiers.data || []) {
    if (row.product_id && !gtinByProduct.has(row.product_id)) {
      gtinByProduct.set(row.product_id, String(row.identifier_value));
    }
  }
  const compositionByProduct = new Map<string, string>();
  for (const row of fields.data || []) {
    if (row.product_id) compositionByProduct.set(row.product_id, String(row.normalized_value || ""));
  }
  const variantByProduct = new Map<string, string>();
  for (const row of variants.data || []) {
    if (row.product_id && !variantByProduct.has(row.product_id)) {
      variantByProduct.set(row.product_id, String(row.name || row.sku || ""));
    }
  }
  const openByProduct = new Map<string, number>();
  const blockingByProduct = new Map<string, number>();
  for (const row of issues.data || []) {
    if (!row.product_id) continue;
    openByProduct.set(row.product_id, (openByProduct.get(row.product_id) || 0) + 1);
    if (row.severity === "critical" || row.severity === "high") {
      blockingByProduct.set(row.product_id, (blockingByProduct.get(row.product_id) || 0) + 1);
    }
  }

  return {
    total: count || 0,
    page,
    pageSize,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      style_code: row.style_code,
      category: row.category,
      data_completeness: row.data_completeness,
      passport_state: row.passport_state,
      last_updated_at: row.last_updated_at,
      gtin: gtinByProduct.get(row.id) || null,
      variant: variantByProduct.get(row.id) || null,
      composition: compositionByProduct.get(row.id) || null,
      openIssueCount: openByProduct.get(row.id) || 0,
      blockingIssueCount: blockingByProduct.get(row.id) || 0,
    })),
  };
}

export async function loadOrgProduct(client: SupabaseClient, organizationId: string, productId: string) {
  const { data: product } = await client
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .maybeSingle();
  if (!product) return null;
  const directory = await loadOrgMemberDirectory(client, organizationId);
  const [fields, issues, identifiers, sourceQuery, activity, variants, passports, identIssues] =
    await Promise.all([
      client
        .from("normalized_fields")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .order("field_key"),
      client.from("issues").select("*").eq("organization_id", organizationId).eq("product_id", productId),
      client
        .from("product_identifiers")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("product_id", productId),
      client
        .from("source_records")
        .select("id, source_system, source_url, retrieved_at, created_at, payload_hash, original_payload")
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .order("created_at", { ascending: true }),
      client
        .from("activity_events")
        .select("id, title, detail, created_at, actor_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(40),
      client
        .from("variants")
        .select("id, name, sku, gtin")
        .eq("organization_id", organizationId)
        .eq("product_id", productId),
      client
        .from("passports")
        .select("id, public_id, state, current_version_id, created_at, updated_at")
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .maybeSingle(),
      client
        .from("issues")
        .select("id, issue_type, severity, title, status, original_value, interpreted_value, detail, product_id, created_at, updated_at")
        .eq("organization_id", organizationId)
        .eq("issue_type", "identifier"),
    ]);

  let sourceRecords = sourceQuery.data || [];
  if (sourceQuery.error) {
    const fallback = await client
      .from("source_records")
      .select("id, source_system, source_url, retrieved_at, created_at, payload_hash")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    sourceRecords = fallback.data || [];
  }

  const versions = passports.data?.id
    ? await client
        .from("passport_versions")
        .select("id, version_number, state, published_at, change_summary, actor_id, created_at")
        .eq("organization_id", organizationId)
        .eq("passport_id", passports.data.id)
        .order("version_number", { ascending: true })
    : { data: [] };

  const carriers = passports.data?.id
    ? await client
        .from("data_carriers")
        .select("public_url, carrier_type")
        .eq("organization_id", organizationId)
        .eq("passport_id", passports.data.id)
        .limit(1)
    : { data: [] };

  const reviews = (activity.data || []).filter((row) =>
    String(row.detail || "").includes(`product:${productId}`)
  );

  const relatedIdentifierIssues = (identIssues.data || []).filter((row) => {
    if (row.product_id === productId) return false;
    const parsed = parseIdentifierIssueDetail(row.detail);
    return parsed?.matchedProductId === productId;
  });

  return {
    product,
    fields: (fields.data || []).map((field) => ({
      ...field,
      reviewer: reviewerFromDirectory(directory, field.reviewer_id),
    })),
    issues: issues.data || [],
    relatedIdentifierIssues,
    identifiers: identifiers.data || [],
    sourceRecords,
    variants: variants.data || [],
    reviews: reviews.map((row) => ({
      ...row,
      actor: reviewerFromDirectory(directory, row.actor_id),
    })),
    passport: passports.data
      ? {
          ...passports.data,
          publicUrl: carriers.data?.[0]?.public_url || `/p/${passports.data.public_id}`,
          versions: (versions.data || []).map((row) => ({
            ...row,
            actor: reviewerFromDirectory(directory, row.actor_id),
          })),
        }
      : null,
    directory,
  };
}

export type OrgIssueRow = {
  id: string;
  issue_type: string;
  severity: string;
  title: string;
  status: string;
  original_value: string | null;
  interpreted_value: string | null;
  created_at: string;
  updated_at: string | null;
  product_id: string | null;
  detail: string | null;
  productName: string | null;
  productSku: string | null;
  identifier: IdentifierIssueDetail | null;
  resolver: ReviewerIdentity | null;
  resolvedAt: string | null;
};

export async function loadOrgIssues(client: SupabaseClient, organizationId: string): Promise<OrgIssueRow[]> {
  const directory = await loadOrgMemberDirectory(client, organizationId);
  const { data } = await client
    .from("issues")
    .select(
      "id, issue_type, severity, title, status, original_value, interpreted_value, created_at, updated_at, product_id, detail, assignee_id"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data || [];
  const productIds = Array.from(new Set(rows.map((row) => row.product_id).filter(Boolean))) as string[];
  const matchedIds = rows
    .map((row) => parseIdentifierIssueDetail(row.detail)?.matchedProductId)
    .filter((id): id is string => Boolean(id));
  const allIds = Array.from(new Set([...productIds, ...matchedIds]));
  const products = allIds.length
    ? await client.from("products").select("id, name, sku").eq("organization_id", organizationId).in("id", allIds)
    : { data: [] };
  const productById = new Map((products.data || []).map((row) => [row.id, row]));

  return rows.map((row) => {
    const identifier = parseIdentifierIssueDetail(row.detail);
    const product = row.product_id ? productById.get(row.product_id) : null;
    return {
      id: row.id,
      issue_type: row.issue_type,
      severity: row.severity,
      title: row.title,
      status: row.status,
      original_value: row.original_value,
      interpreted_value: row.interpreted_value,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product_id: row.product_id,
      detail: row.detail,
      productName: product?.name || null,
      productSku: product?.sku || null,
      identifier: identifier
        ? {
            ...identifier,
            matched: identifier.matched
              ? {
                  ...identifier.matched,
                  name:
                    identifier.matched.name ||
                    productById.get(identifier.matchedProductId || "")?.name ||
                    identifier.matched.name,
                }
              : identifier.matched,
          }
        : null,
      resolver: identifier?.resolution
        ? {
            id: identifier.resolution.actorId,
            name: identifier.resolution.actorName,
            role: identifier.resolution.actorRole || null,
            email: null,
          }
        : row.assignee_id
          ? reviewerFromDirectory(directory, row.assignee_id)
          : null,
      resolvedAt: identifier?.resolution?.at || (row.status !== "open" ? row.updated_at : null),
    };
  });
}

export async function loadOrgPassports(client: SupabaseClient, organizationId: string) {
  const directory = await loadOrgMemberDirectory(client, organizationId);
  const [{ data: passports }, { data: carriers }, { data: versions }, { data: products }] = await Promise.all([
    client
      .from("passports")
      .select("id, public_id, state, product_id, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    client
      .from("data_carriers")
      .select("passport_id, public_url, carrier_type")
      .eq("organization_id", organizationId),
    client
      .from("passport_versions")
      .select("id, passport_id, version_number, state, published_at, change_summary, actor_id")
      .eq("organization_id", organizationId)
      .order("version_number", { ascending: true }),
    client
      .from("products")
      .select("id, name, sku, passport_state")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
  ]);
  const urlByPassport = new Map<string, string>();
  for (const row of carriers || []) {
    if (row.passport_id && row.public_url && !urlByPassport.has(row.passport_id)) {
      urlByPassport.set(row.passport_id, row.public_url);
    }
  }
  const versionsByPassport = new Map<
    string,
    Array<{
      id: string;
      passport_id: string;
      version_number: number;
      state: string;
      published_at: string | null;
      change_summary: string | null;
      actor_id: string | null;
    }>
  >();
  for (const row of versions || []) {
    const list = versionsByPassport.get(row.passport_id) || [];
    list.push(row);
    versionsByPassport.set(row.passport_id, list);
  }
  const productById = new Map((products || []).map((row) => [row.id, row]));
  const publishedIds = new Set((passports || []).map((row) => row.product_id));
  const readyUnpublished = (products || []).filter(
    (row) => row.passport_state === "ready" && !publishedIds.has(row.id)
  );

  return {
    passports: (passports || []).map((passport) => {
      const versionRows = versionsByPassport.get(passport.id) || [];
      const current = versionRows[versionRows.length - 1] || null;
      return {
        ...passport,
        productName: productById.get(passport.product_id)?.name || null,
        productSku: productById.get(passport.product_id)?.sku || null,
        publicUrl: urlByPassport.get(passport.id) || `/p/${passport.public_id}`,
        versionCount: versionRows.length,
        currentVersion: current?.version_number || null,
        versions: versionRows.map((row) => ({
          ...row,
          actor: reviewerFromDirectory(directory, row.actor_id),
          publishedLabel: formatOperatorTime(row.published_at),
        })),
      };
    }),
    readyUnpublished,
  };
}

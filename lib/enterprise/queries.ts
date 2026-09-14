import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCatalogSort, catalogSortNeedsFullFetch, sortCatalogProducts } from "./catalog-sort";
import { resolveTraceabilityFilterProductIds } from "./traceability-filters";
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
  created_at?: string;
  gtin: string | null;
  variant: string | null;
  composition: string | null;
  openIssueCount: number;
  blockingIssueCount: number;
};

export async function loadOrgProducts(
  client: SupabaseClient,
  organizationId: string,
  filters: {
    q?: string;
    passportState?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    category?: string;
    focus?: string;
    origin?: string;
  } = {}
): Promise<{ rows: CatalogProductRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(filters.pageSize || 50, 1), 200);
  const page = Math.max(filters.page || 1, 1);
  const q = sanitizeSearch(filters.q);
  const sort = parseCatalogSort(filters.sort);
  const needsFullSort = catalogSortNeedsFullFetch(sort);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let traceabilityIds: string[] | null = null;
  if (filters.focus || filters.origin) {
    traceabilityIds = await resolveTraceabilityFilterProductIds(client, organizationId, {
      focus: filters.focus,
      origin: filters.origin,
    });
    if (traceabilityIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
  }

  let query = client
    .from("products")
    .select("id, name, sku, style_code, category, data_completeness, passport_state, last_updated_at, created_at", {
      count: "exact",
    })
    .eq("organization_id", organizationId)
    .eq("lifecycle", "active");

  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,style_code.ilike.%${q}%`);
  }
  if (filters.passportState) {
    query = query.eq("passport_state", filters.passportState);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (traceabilityIds) {
    query = query.in("id", traceabilityIds);
  }

  if (!needsFullSort) {
    if (sort === "name") query = query.order("name", { ascending: true });
    else if (sort === "name_desc") query = query.order("name", { ascending: false });
    else if (sort === "recent") query = query.order("created_at", { ascending: false });
    else query = query.order("last_updated_at", { ascending: false });
    query = query.range(from, to);
  } else {
    query = query.order("last_updated_at", { ascending: false }).limit(500);
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

  const mapped = rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      style_code: row.style_code,
      category: row.category,
      data_completeness: row.data_completeness,
      passport_state: row.passport_state,
      last_updated_at: row.last_updated_at,
      created_at: row.created_at,
      gtin: gtinByProduct.get(row.id) || null,
      variant: variantByProduct.get(row.id) || null,
      composition: compositionByProduct.get(row.id) || null,
      openIssueCount: openByProduct.get(row.id) || 0,
      blockingIssueCount: blockingByProduct.get(row.id) || 0,
    }));

  const sorted = needsFullSort ? sortCatalogProducts(mapped, sort) : mapped;
  const paged = needsFullSort ? sorted.slice(from, to + 1) : sorted;

  return {
    total: needsFullSort ? sorted.length : count || 0,
    page,
    pageSize,
    rows: paged,
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
  const [fields, issues, identifiers, sourceQuery, activity, variants, passports, identity, identIssues] =
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
        .from("persistent_identities")
        .select("id, public_id")
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .eq("active", true)
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
        .select(
          "id, public_url, carrier_type, state, artwork_variant, batch_label, activated_at, retired_at, created_at"
        )
        .eq("organization_id", organizationId)
        .eq("passport_id", passports.data.id)
        .order("created_at", { ascending: false })
    : await client
        .from("data_carriers")
        .select(
          "id, public_url, carrier_type, state, artwork_variant, batch_label, activated_at, retired_at, created_at"
        )
        .eq("organization_id", organizationId)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

  const activeCarrier =
    (carriers.data || []).find((row) => row.state === "active") ||
    (carriers.data || []).find((row) => row.state === "draft") ||
    carriers.data?.[0];

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
          publicUrl: activeCarrier?.public_url || `/p/${passports.data.public_id}`,
          carriers: carriers.data || [],
          versions: (versions.data || []).map((row) => ({
            ...row,
            actor: reviewerFromDirectory(directory, row.actor_id),
          })),
        }
      : identity.data?.public_id
        ? {
            id: "",
            public_id: identity.data.public_id,
            state: product.passport_state || "ready",
            current_version_id: null,
            created_at: null,
            updated_at: null,
            publicUrl: activeCarrier?.public_url || `/p/${identity.data.public_id}`,
            carriers: carriers.data || [],
            versions: [],
          }
        : null,
    identityPublicId: identity.data?.public_id || null,
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
  productStyleCode: string | null;
  identifier: IdentifierIssueDetail | null;
  assignee: ReviewerIdentity | null;
  resolver: ReviewerIdentity | null;
  resolvedAt: string | null;
  productOrigin: string | null;
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
  const [products, originFields] = await Promise.all([
    allIds.length
      ? client
          .from("products")
          .select("id, name, sku, style_code")
          .eq("organization_id", organizationId)
          .in("id", allIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? client
          .from("normalized_fields")
          .select("product_id, normalized_value")
          .eq("organization_id", organizationId)
          .in("product_id", productIds)
          .in("field_key", ["manufacturing_country", "country_of_origin"])
      : Promise.resolve({ data: [] }),
  ]);
  const productById = new Map((products.data || []).map((row) => [row.id, row]));
  const originByProduct = new Map<string, string>();
  for (const row of originFields.data || []) {
    if (row.product_id && row.normalized_value && !originByProduct.has(row.product_id)) {
      originByProduct.set(row.product_id, String(row.normalized_value));
    }
  }

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
      productStyleCode: product?.style_code || null,
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
      assignee:
        row.status === "open" || row.status === "assigned"
          ? reviewerFromDirectory(directory, row.assignee_id)
          : null,
      resolver: identifier?.resolution
        ? {
            id: identifier.resolution.actorId,
            name: identifier.resolution.actorName,
            role: identifier.resolution.actorRole || null,
            email: null,
          }
        : row.status !== "open" && row.assignee_id
          ? reviewerFromDirectory(directory, row.assignee_id)
          : null,
      resolvedAt: identifier?.resolution?.at || (row.status !== "open" ? row.updated_at : null),
      productOrigin: row.product_id ? originByProduct.get(row.product_id) || null : null,
    };
  });
}

export type OrgPassportCatalogItem = {
  id: string;
  productId: string;
  passportId: string | null;
  public_id: string | null;
  state: string;
  productName: string;
  productSku: string | null;
  productStyleCode: string | null;
  productCategory: string | null;
  variantId: string | null;
  variantLabel: string | null;
  marketLabel: string | null;
  identityKey: string;
  publicUrl: string;
  versionCount: number;
  currentVersion: number | null;
  created_at: string | null;
  updated_at: string | null;
  hasPassportShell: boolean;
  versions: Array<{
    id: string;
    passport_id: string;
    version_number: number;
    state: string;
    published_at: string | null;
    change_summary: string | null;
    actor_id: string | null;
    actor: ReviewerIdentity;
    publishedLabel: string;
  }>;
};

const PUBLISHED_PASSPORT_STATES = new Set(["published", "update_required"]);

function passportStateRank(state: string): number {
  const ranks: Record<string, number> = {
    published: 50,
    update_required: 40,
    ready: 30,
    review_required: 20,
    incomplete: 10,
    archived: 0,
  };
  return ranks[state] ?? 0;
}

function passportIdentityKey(input: {
  product_id: string | null;
  variant_id?: string | null;
  public_id?: string | null;
}): string {
  return [input.product_id || "none", input.variant_id || "product-level", input.public_id || "pending"].join(":");
}

/** Merge only true duplicate shells — same product, variant scope, and public identity. */
function dedupePassportIdentities<
  T extends {
    product_id: string | null;
    variant_id?: string | null;
    public_id?: string | null;
    state: string;
    updated_at: string | null;
  },
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = passportIdentityKey(row);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const rankDiff = passportStateRank(row.state) - passportStateRank(existing.state);
    if (
      rankDiff > 0 ||
      (rankDiff === 0 && Date.parse(row.updated_at || "") > Date.parse(existing.updated_at || ""))
    ) {
      map.set(key, row);
    }
  }
  return Array.from(map.values());
}

export async function loadOrgPassports(client: SupabaseClient, organizationId: string) {
  const directory = await loadOrgMemberDirectory(client, organizationId);
  const [{ data: passports }, { data: carriers }, { data: versions }, { data: products }] = await Promise.all([
    client
      .from("passports")
      .select("id, public_id, state, product_id, variant_id, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(500),
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
      .select("id, name, sku, style_code, category, passport_state")
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
  const productIds = Array.from(productById.keys());
  const { data: variants } = productIds.length
    ? await client
        .from("variants")
        .select("id, product_id, name, sku, gtin")
        .eq("organization_id", organizationId)
        .in("product_id", productIds)
    : { data: [] };
  const variantById = new Map((variants || []).map((row) => [row.id, row]));
  const passportProductIds = new Set((passports || []).map((row) => row.product_id).filter(Boolean));

  const enriched = (passports || []).map((passport) => {
    const versionRows = versionsByPassport.get(passport.id) || [];
    const current = versionRows[versionRows.length - 1] || null;
    const product = productById.get(passport.product_id);
    const variant = passport.variant_id ? variantById.get(passport.variant_id) : null;
    const variantLabel = variant?.sku || variant?.name || null;
    return {
      id: passport.id,
      productId: passport.product_id,
      passportId: passport.id,
      public_id: passport.public_id,
      state: passport.state,
      productName: product?.name || "Product",
      productSku: variant?.sku || product?.sku || null,
      productStyleCode: product?.style_code || null,
      productCategory: product?.category || null,
      variantId: passport.variant_id || null,
      variantLabel,
      marketLabel: variantLabel ? `Variant · ${variantLabel}` : "Product-level identity",
      identityKey: passportIdentityKey(passport),
      publicUrl: urlByPassport.get(passport.id) || `/p/${passport.public_id}`,
      versionCount: versionRows.length,
      currentVersion: current?.version_number || null,
      created_at: passport.created_at,
      updated_at: passport.updated_at,
      hasPassportShell: true,
      product_id: passport.product_id,
      variant_id: passport.variant_id,
      versions: versionRows.map((row) => ({
        ...row,
        actor: reviewerFromDirectory(directory, row.actor_id),
        publishedLabel: formatOperatorTime(row.published_at),
      })),
    };
  });

  const deduped = dedupePassportIdentities(enriched).map(({ product_id: _pid, ...row }) => row as OrgPassportCatalogItem);

  const published = deduped
    .filter((row) => PUBLISHED_PASSPORT_STATES.has(row.state))
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));

  const awaitingFromPassports = deduped
    .filter((row) => !PUBLISHED_PASSPORT_STATES.has(row.state))
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));

  const awaitingFromProducts: OrgPassportCatalogItem[] = (products || [])
    .filter((row) => row.passport_state === "ready" && !passportProductIds.has(row.id))
    .map((row) => ({
      id: row.id,
      productId: row.id,
      passportId: null,
      public_id: null,
      state: "ready",
      productName: row.name,
      productSku: row.sku,
      productStyleCode: row.style_code,
      productCategory: row.category,
      variantId: null,
      variantLabel: null,
      marketLabel: "Product-level identity",
      identityKey: `${row.id}:product-level:pending`,
      publicUrl: "",
      versionCount: 0,
      currentVersion: null,
      created_at: null,
      updated_at: null,
      hasPassportShell: false,
      versions: [],
    }));

  const awaitingPublish = [...awaitingFromPassports, ...awaitingFromProducts].sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );

  return {
    awaitingPublish,
    published,
    rawPassportCount: (passports || []).length,
    identityCount: deduped.length,
    productCount: new Set(deduped.map((row) => row.productId)).size,
  };
}


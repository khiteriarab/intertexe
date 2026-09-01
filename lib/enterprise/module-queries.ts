import type { SupabaseClient } from "@supabase/supabase-js";
import { ESPR_FOUNDATION_RULESET } from "./regulatory-evaluator";
import { loadOrgOverview } from "./queries";
import { loadOrgMemberDirectory, reviewerFromDirectory } from "./reviewer-display";

export type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  productCount: number;
  openRequestCount: number;
  evidenceCount: number;
  outstandingCount: number;
  lastActivityAt: string | null;
  productIds: string[];
};

export async function loadOrgSuppliers(client: SupabaseClient, organizationId: string) {
  const [{ data: suppliers }, { data: requests }, { data: evidence }, { count: openSupplierIssues }] =
    await Promise.all([
      client.from("suppliers").select("id, name, email, created_at").eq("organization_id", organizationId).order("name"),
      client.from("supplier_requests").select("supplier_id, product_id, status, created_at").eq("organization_id", organizationId),
      client.from("evidence_records").select("source_supplier_id, verification_status, product_id, updated_at").eq("organization_id", organizationId).not("source_supplier_id", "is", null),
      client.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "open").eq("issue_type", "supplier"),
    ]);

  const rows = (suppliers || []).map((supplier) => {
    const supplierRequests = (requests || []).filter((r) => r.supplier_id === supplier.id);
    const supplierEvidence = (evidence || []).filter((e) => e.source_supplier_id === supplier.id);
    const productIds = Array.from(new Set([
      ...supplierRequests.map((r) => r.product_id).filter(Boolean),
      ...supplierEvidence.map((e) => e.product_id).filter(Boolean),
    ])) as string[];
    const openRequests = supplierRequests.filter((r) => r.status === "open").length;
    const outstandingEvidence = supplierEvidence.filter((e) =>
      ["missing", "requested", "rejected", "expired"].includes(String(e.verification_status))
    ).length;
    const timestamps = [supplier.created_at, ...supplierRequests.map((r) => r.created_at), ...supplierEvidence.map((e) => e.updated_at)].filter(Boolean) as string[];
    return {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      created_at: supplier.created_at,
      productCount: productIds.length,
      openRequestCount: openRequests,
      evidenceCount: supplierEvidence.length,
      outstandingCount: openRequests + outstandingEvidence,
      lastActivityAt: timestamps.sort().reverse()[0] || null,
      productIds,
    } satisfies SupplierRow;
  });

  return {
    suppliers: rows,
    summary: {
      total: rows.length,
      withProducts: rows.filter((r) => r.productCount > 0).length,
      openSupplierIssues: openSupplierIssues || 0,
      openRequests: (requests || []).filter((r) => r.status === "open").length,
    },
  };
}

export async function loadOrgRegulations(client: SupabaseClient, organizationId: string) {
  const overview = await loadOrgOverview(client, organizationId);
  const ruleVersion = await client
    .from("regulatory_rule_versions")
    .select("id, version_label, effective_date, interpretation_status, notes, framework:regulatory_frameworks(name, jurisdiction, source_url)")
    .eq("version_label", ESPR_FOUNDATION_RULESET)
    .maybeSingle();
  const requirements = ruleVersion.data?.id
    ? await client.from("regulatory_requirements").select("requirement_key, field_key, obligation_kind, severity, authoritative_source, source_reference").eq("rule_version_id", ruleVersion.data.id)
    : { data: [] };
  const [missing, regulatoryIssues] = await Promise.all([
    client.from("missing_data_register").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "open"),
    client.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "open").in("issue_type", ["missing_data", "validation", "regulatory"]),
  ]);
  const framework = Array.isArray(ruleVersion.data?.framework) ? ruleVersion.data.framework[0] : ruleVersion.data?.framework;
  return {
    overview,
    ruleset: ruleVersion.data ? {
      versionLabel: ruleVersion.data.version_label,
      effectiveDate: ruleVersion.data.effective_date,
      status: ruleVersion.data.interpretation_status,
      notes: ruleVersion.data.notes,
      frameworkName: framework?.name || "ESPR",
      jurisdiction: framework?.jurisdiction || "EU",
      sourceUrl: framework?.source_url || null,
    } : null,
    requirements: requirements.data || [],
    gapSummary: {
      openMissingFields: missing.count || 0,
      openRegulatoryIssues: regulatoryIssues.count || 0,
      productsEvaluated: overview.productCount,
      readyOrPublished: overview.readyCount + overview.publishedCount,
      needsAttention: overview.productCount - (overview.readyCount + overview.publishedCount),
    },
  };
}

export async function loadOrgBenchmarking(client: SupabaseClient, organizationId: string) {
  const [{ data: products }, { data: issues }] = await Promise.all([
    client.from("products").select("id, category, passport_state, data_completeness").eq("organization_id", organizationId).eq("lifecycle", "active"),
    client.from("issues").select("product_id, status").eq("organization_id", organizationId).eq("status", "open"),
  ]);
  const rows = products || [];
  const byCategory = new Map<string, { total: number; states: Record<string, number>; issues: number }>();
  const byState: Record<string, number> = {};
  const completenessBuckets = { high: 0, mid: 0, low: 0, unknown: 0 };
  for (const product of rows) {
    const cat = String(product.category || "Uncategorized").trim() || "Uncategorized";
    const state = String(product.passport_state || "incomplete");
    byState[state] = (byState[state] || 0) + 1;
    const bucket = byCategory.get(cat) || { total: 0, states: {}, issues: 0 };
    bucket.total += 1;
    bucket.states[state] = (bucket.states[state] || 0) + 1;
    byCategory.set(cat, bucket);
    const c = product.data_completeness;
    if (c == null) completenessBuckets.unknown += 1;
    else if (c >= 80) completenessBuckets.high += 1;
    else if (c >= 50) completenessBuckets.mid += 1;
    else completenessBuckets.low += 1;
  }
  for (const issue of issues || []) {
    if (!issue.product_id) continue;
    const product = rows.find((p) => p.id === issue.product_id);
    const cat = String(product?.category || "Uncategorized").trim() || "Uncategorized";
    const bucket = byCategory.get(cat) || { total: 0, states: {}, issues: 0 };
    bucket.issues += 1;
    byCategory.set(cat, bucket);
  }
  return {
    productCount: rows.length,
    byState,
    completenessBuckets,
    categoryRows: Array.from(byCategory.entries()).map(([category, stats]) => ({
      category, total: stats.total, published: stats.states.published || 0, ready: stats.states.ready || 0,
      incomplete: (stats.states.incomplete || 0) + (stats.states.review_required || 0), openIssues: stats.issues,
    })).sort((a, b) => b.total - a.total),
    publishedPct: rows.length ? Math.round(((byState.published || 0) / rows.length) * 100) : 0,
    readyPct: rows.length ? Math.round(((byState.ready || 0) / rows.length) * 100) : 0,
  };
}

export async function loadOrgAnalytics(client: SupabaseClient, organizationId: string) {
  const overview = await loadOrgOverview(client, organizationId);
  const [{ count: resolvedIssues }, { count: conflictIssues }, { data: activity }, { count: importCount }] = await Promise.all([
    client.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).neq("status", "open"),
    client.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "open").in("issue_type", ["conflict", "identifier"]),
    client.from("activity_events").select("title").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    client.from("imports").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);
  const activityCounts = { imports: 0, publishes: 0, updates: 0, reviews: 0, other: 0 };
  for (const row of activity || []) {
    const title = String(row.title || "");
    if (/^Imported/i.test(title)) activityCounts.imports += 1;
    else if (/^Published passport/i.test(title)) activityCounts.publishes += 1;
    else if (/^Updated/i.test(title)) activityCounts.updates += 1;
    else if (/^Approved/i.test(title)) activityCounts.reviews += 1;
    else activityCounts.other += 1;
  }
  return { overview, issues: { open: overview.issueCount, resolved: resolvedIssues || 0, missingFields: overview.missingCount, conflicts: conflictIssues || 0 },
    passports: { published: overview.publishedCount, ready: overview.readyCount, incomplete: overview.productStateCounts.incomplete || 0, updateRequired: overview.updateRequiredCount },
    catalog: { total: overview.productCount, imports: importCount || 0 }, activityCounts };
}

export type IntegrationRow = { id: string; label: string; category: string; state: "connected" | "available" | "not_configured"; detail: string; href?: string };

export async function loadOrgIntegrations(client: SupabaseClient, organizationId: string, slug: string) {
  const [{ count: importCount }, { count: apiCount }, { count: webhookCount }, { data: registrations }] = await Promise.all([
    client.from("imports").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    client.from("api_credentials").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    client.from("webhooks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    client.from("dpp_registry_registrations").select("status").eq("organization_id", organizationId).limit(20),
  ]);
  const registryConnected = (registrations || []).some((r) => ["submitted", "registered", "registration_ready"].includes(String(r.status)));
  return {
    rows: [
      { id: "csv-import", label: "Catalog CSV import", category: "Data import", state: (importCount || 0) > 0 ? "connected" as const : "available" as const, detail: (importCount || 0) > 0 ? `${importCount} import(s) recorded` : "Upload and map a catalog from Products", href: `/dashboard/${slug}/products` },
      { id: "org-api", label: "Organization API credentials", category: "API", state: (apiCount || 0) > 0 ? "connected" as const : "not_configured" as const, detail: (apiCount || 0) > 0 ? `${apiCount} credential(s) on file` : "No API credentials configured", href: `/dashboard/${slug}/developers` },
      { id: "webhooks", label: "Outbound webhooks", category: "API", state: (webhookCount || 0) > 0 ? "connected" as const : "not_configured" as const, detail: (webhookCount || 0) > 0 ? `${webhookCount} webhook(s) configured` : "No webhooks configured" },
      { id: "eu-registry", label: "EU DPP registry (manual provider)", category: "Registry", state: registryConnected ? "connected" as const : "available" as const, detail: registryConnected ? "Registration records exist" : "Available when a passport version is prepared for submission", href: `/dashboard/${slug}/passports` },
    ] satisfies IntegrationRow[],
  };
}

export async function loadOrgDevelopers(client: SupabaseClient, organizationId: string, role: string) {
  const canSeeCredentials = ["owner", "admin", "developer"].includes(role);
  const [{ data: org }, credQuery, { count: webhookCount }] = await Promise.all([
    client.from("organizations").select("id, slug, name").eq("id", organizationId).maybeSingle(),
    canSeeCredentials ? client.from("api_credentials").select("id, name, prefix, last_used_at, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    client.from("webhooks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
  return { organization: org, credentials: credQuery.data || [], webhookCount: webhookCount || 0, canSeeCredentials, publicPassportExample: `${origin}/p/{public_id}`, docsUrl: `${origin}/platform/docs` };
}

export type FileSourceRow = { id: string; kind: "import" | "source_record" | "file"; label: string; status: string | null; productId: string | null; productName: string | null; createdAt: string; detail: string | null };

export async function loadOrgFiles(client: SupabaseClient, organizationId: string) {
  const [{ data: imports }, { data: sources }, { data: files }] = await Promise.all([
    client.from("imports").select("id, original_filename, status, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
    client.from("source_records").select("id, product_id, source_system, payload_hash, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
    client.from("files").select("id, path, kind, mime_type, byte_size, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50),
  ]);
  const productIds = Array.from(new Set((sources || []).map((s) => s.product_id).filter(Boolean))) as string[];
  const { data: products } = productIds.length ? await client.from("products").select("id, name").eq("organization_id", organizationId).in("id", productIds) : { data: [] };
  const productById = new Map((products || []).map((p) => [p.id, p.name]));
  const importRows: FileSourceRow[] = (imports || []).map((row) => ({ id: row.id, kind: "import", label: row.original_filename || "Catalog import", status: row.status, productId: null, productName: null, createdAt: row.created_at, detail: "CSV catalog import" }));
  const sourceRows: FileSourceRow[] = (sources || []).map((row) => ({ id: row.id, kind: "source_record", label: row.source_system || "Source record", status: null, productId: row.product_id, productName: row.product_id ? productById.get(row.product_id) || null : null, createdAt: row.created_at, detail: row.payload_hash ? `Hash ${row.payload_hash.slice(0, 12)}` : null }));
  const fileRows: FileSourceRow[] = (files || []).map((row) => ({ id: row.id, kind: "file", label: row.path.split("/").pop() || row.path, status: row.kind, productId: null, productName: null, createdAt: row.created_at, detail: [row.mime_type, row.byte_size ? `${row.byte_size} bytes` : null].filter(Boolean).join(" · ") || null }));
  const rows = [...importRows, ...sourceRows, ...fileRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { rows, summary: { imports: importRows.length, sourceRecords: sourceRows.length, files: fileRows.length } };
}

export async function loadOrgActivityFeed(client: SupabaseClient, organizationId: string, limit = 100) {
  const directory = await loadOrgMemberDirectory(client, organizationId);
  const { data } = await client.from("activity_events").select("id, title, detail, created_at, actor_id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(limit);
  return (data || []).map((row) => ({ id: row.id, title: row.title, detail: row.detail, created_at: row.created_at, actor: reviewerFromDirectory(directory, row.actor_id) }));
}

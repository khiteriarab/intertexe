/**
 * Shared retail taxonomy contract — Supabase is source of truth.
 * Web + iOS consume /api/catalog/taxonomy (no duplicated category arrays).
 */
import { getServerSupabase } from "./supabase-service-client";
import { queryCatalogBrowsePageV2 } from "./catalog-browse-v2";
import { fetchFootwearCatalogPage } from "./footwear-catalog";

export type TaxonomyDepartment = "clothing" | "shoes";

export type CatalogTaxonomyNode = {
  slug: string;
  parentSlug: string | null;
  department: TaxonomyDepartment;
  label: string;
  sortOrder: number;
  isActive: boolean;
  minCountThreshold: number;
  /** Region-specific live offer count (when counts fetched). */
  liveCount?: number;
};

export type TaxonomyMenuRow = CatalogTaxonomyNode & {
  href: string;
  pathSegment: string;
};

const TAXONOMY_VERSION = "retail-v1";

export function taxonomyPathSegment(slug: string): string {
  const parts = slug.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : slug;
}

export function taxonomyHref(department: TaxonomyDepartment, slug: string): string {
  const seg = taxonomyPathSegment(slug);
  if (seg === "all") return `/shop/${department}/all`;
  return `/shop/${department}/${seg}`;
}

export function isDepartmentAllSlug(slug: string): boolean {
  return slug === "clothing/all" || slug === "shoes/all";
}

/** Map clothing/* taxonomy slug → catalog_browse_page_v2 category param. */
export function taxonomyLegacyBrowseCategory(taxonomySlug: string): string | null {
  if (!taxonomySlug.startsWith("clothing/")) return null;
  const seg = taxonomyPathSegment(taxonomySlug).toLowerCase();
  const map: Record<string, string> = {
    dresses: "dresses",
    "bridal-dresses": "dresses",
    shirts: "shirts",
    blouses: "blouses",
    "tanks-and-camisoles": "tops",
    "t-shirts": "tops",
    tops: "tops",
    knitwear: "knitwear",
    trousers: "trousers",
    jeans: "jeans",
    bottoms: "trousers",
    shorts: "shorts",
    skirts: "skirts",
    jackets: "jackets",
    coats: "coats",
    lingerie: "lingerie",
    swimwear: "swimwear",
    jumpsuits: "jumpsuits",
  };
  return map[seg] ?? null;
}

/** Browse grids allow department-all slugs even when the node is menu-only (inactive in nav seed). */
export function resolveTaxonomyBrowseNode(
  nodes: CatalogTaxonomyNode[],
  taxonomySlug: string
): CatalogTaxonomyNode | null {
  const node = nodes.find((n) => n.slug === taxonomySlug);
  if (!node) {
    if (taxonomySlug === "clothing/all") {
      return {
        slug: "clothing/all",
        parentSlug: null,
        department: "clothing",
        label: "All Clothing",
        sortOrder: 0,
        isActive: true,
        minCountThreshold: 0,
      };
    }
    if (taxonomySlug === "shoes/all") {
      return {
        slug: "shoes/all",
        parentSlug: null,
        department: "shoes",
        label: "All Shoes",
        sortOrder: 0,
        isActive: true,
        minCountThreshold: 0,
      };
    }
    return null;
  }
  if (isDepartmentAllSlug(taxonomySlug)) return { ...node, isActive: true };
  if (!node.isActive) return null;
  return node;
}

function prependDepartmentAllRow(
  rows: TaxonomyMenuRow[],
  department: TaxonomyDepartment
): TaxonomyMenuRow[] {
  const allSlug = `${department}/all`;
  if (rows.some((r) => r.slug === allSlug)) return rows;
  const allRow: TaxonomyMenuRow = {
    slug: allSlug,
    parentSlug: null,
    department,
    label: department === "shoes" ? "All Shoes" : "All Clothing",
    sortOrder: -1,
    isActive: true,
    minCountThreshold: 0,
    href: taxonomyHref(department, allSlug),
    pathSegment: "all",
  };
  return [allRow, ...rows];
}

export function slugFromPath(department: TaxonomyDepartment, pathSegment: string): string {
  const seg = pathSegment.trim().toLowerCase();
  if (!seg || seg === "all") return `${department}/all`;
  return `${department}/${seg}`;
}

function mapNode(row: Record<string, unknown>): CatalogTaxonomyNode {
  return {
    slug: String(row.slug ?? ""),
    parentSlug: row.parent_slug != null ? String(row.parent_slug) : null,
    department: String(row.department ?? "") as TaxonomyDepartment,
    label: String(row.label ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active === true,
    minCountThreshold: Number(row.min_count_threshold ?? 0),
  };
}

/** Flat menu order: roots and children interleaved by sort_order (NAP-style flat list). */
export function flattenTaxonomyMenu(nodes: CatalogTaxonomyNode[]): TaxonomyMenuRow[] {
  const byDept = nodes
    .filter((n) => !n.slug.endsWith("/all"))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  return byDept.map((n) => ({
    ...n,
    pathSegment: taxonomyPathSegment(n.slug),
    href: taxonomyHref(n.department, n.slug),
  }));
}

export async function fetchTaxonomyNodes(opts?: {
  department?: TaxonomyDepartment;
  activeOnly?: boolean;
}): Promise<CatalogTaxonomyNode[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  let q = supabase
    .from("catalog_taxonomy_nodes")
    .select("slug, parent_slug, department, label, sort_order, is_active, min_count_threshold")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (opts?.department) q = q.eq("department", opts.department);
  if (opts?.activeOnly) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((row) => mapNode(row as Record<string, unknown>));
}

export async function fetchTaxonomyCounts(
  department: TaxonomyDepartment,
  region = "us"
): Promise<Record<string, number>> {
  const supabase = getServerSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc("catalog_taxonomy_node_counts", {
    p_department: department,
    p_region: region.toLowerCase(),
  });
  if (error || !Array.isArray(data)) return {};

  const out: Record<string, number> = {};
  for (const row of data as { slug: string; live_count: number }[]) {
    out[row.slug] = Number(row.live_count) || 0;
  }
  return out;
}

export async function fetchTaxonomyMenu(opts: {
  department: TaxonomyDepartment;
  region?: string;
  activeOnly?: boolean;
  /** Customer menus must not show counts at launch; grids use browse RPC totals. */
  includeCounts?: boolean;
}): Promise<TaxonomyMenuRow[]> {
  const nodes = await fetchTaxonomyNodes({ department: opts.department, activeOnly: opts.activeOnly });

  if (opts.includeCounts === false || opts.includeCounts === undefined) {
    return prependDepartmentAllRow(flattenTaxonomyMenu(nodes), opts.department);
  }

  const counts = await fetchTaxonomyCounts(opts.department, opts.region ?? "us");
  const withCounts = nodes.map((n) => ({
    ...n,
    liveCount: counts[n.slug] ?? 0,
  }));
  return prependDepartmentAllRow(flattenTaxonomyMenu(withCounts), opts.department);
}

export type TaxonomyBrowseOpts = {
  region?: string;
  taxonomySlug: string;
  fiber?: string;
  materialSubtype?: string;
  fabricConstruction?: string;
  color?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type TaxonomyBrowseResult = {
  products: Record<string, unknown>[];
  total: number;
  hasMore: boolean;
  totalStatus: "exact" | "unavailable";
  rpcVersion: string;
};

function mapSort(sort?: string): string {
  switch (sort) {
    case "price-low":
    case "price_asc":
      return "price_asc";
    case "price-high":
    case "price_desc":
      return "price_desc";
    case "natural-high":
    case "most_natural":
      return "most_natural";
    default:
      return "newest";
  }
}

export async function queryTaxonomyBrowse(opts: TaxonomyBrowseOpts): Promise<TaxonomyBrowseResult> {
  const supabase = getServerSupabase();
  const empty: TaxonomyBrowseResult = {
    products: [],
    total: 0,
    hasMore: false,
    totalStatus: "unavailable",
    rpcVersion: "catalog_taxonomy_browse_page",
  };
  if (!supabase) return empty;

  const department = opts.taxonomySlug.split("/")[0] as TaxonomyDepartment;
  const region = (opts.region || "us").toLowerCase();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  // Department-all and mappable leaf slugs — use fast catalog_browse_page_v2 (taxonomy RPC card-dedupe times out).
  if (isDepartmentAllSlug(opts.taxonomySlug)) {
    if (department === "shoes") {
      const page = await fetchFootwearCatalogPage({ region, limit, offset });
      return {
        products: page.products as unknown as Record<string, unknown>[],
        total: 0,
        hasMore: page.hasMore,
        totalStatus: "unavailable",
        rpcVersion: "footwear_catalog_page",
      };
    }
    const v2 = await queryCatalogBrowsePageV2({
      region,
      limit,
      offset,
      fiber: opts.fiber,
      brand: opts.brand,
      search: opts.search,
      sort: opts.sort,
      minPrice: opts.minPrice,
      maxPrice: opts.maxPrice,
      color: opts.color,
      materialSubtype: opts.materialSubtype,
      fabricConstruction: opts.fabricConstruction,
      apparelOnly: true,
    });
    if (v2.error) return empty;
    return {
      products: v2.products as unknown as Record<string, unknown>[],
      total: v2.total ?? 0,
      hasMore: v2.hasMore,
      totalStatus: v2.totalStatus === "exact" || v2.totalStatus === "cached" ? "exact" : "unavailable",
      rpcVersion: v2.rpcVersion,
    };
  }

  const legacyCategory = taxonomyLegacyBrowseCategory(opts.taxonomySlug);
  if (legacyCategory) {
    const v2 = await queryCatalogBrowsePageV2({
      region,
      limit,
      offset,
      category: legacyCategory,
      fiber: opts.fiber,
      brand: opts.brand,
      search: opts.search,
      sort: opts.sort,
      minPrice: opts.minPrice,
      maxPrice: opts.maxPrice,
      color: opts.color,
      materialSubtype: opts.materialSubtype,
      fabricConstruction: opts.fabricConstruction,
      apparelOnly: true,
    });
    if (v2.error) return empty;
    return {
      products: v2.products as unknown as Record<string, unknown>[],
      total: v2.total ?? 0,
      hasMore: v2.hasMore,
      totalStatus: v2.totalStatus === "exact" || v2.totalStatus === "cached" ? "exact" : "unavailable",
      rpcVersion: v2.rpcVersion,
    };
  }

  const rpcName =
    department === "shoes"
      ? "catalog_footwear_taxonomy_browse_page"
      : "catalog_taxonomy_browse_page";

  const params: Record<string, unknown> =
    department === "shoes"
      ? {
          p_region: region,
          p_taxonomy_slug: opts.taxonomySlug,
          p_color: opts.color ?? null,
          p_brand_slug: opts.brand ?? null,
          p_search: opts.search ?? null,
          p_min_price: opts.minPrice ?? null,
          p_max_price: opts.maxPrice ?? null,
          p_sort: mapSort(opts.sort),
          p_limit: limit,
          p_offset: offset,
        }
      : {
          p_region: region,
          p_taxonomy_slug: opts.taxonomySlug,
          p_material_family: opts.fiber ?? null,
          p_material_subtype: opts.materialSubtype ?? null,
          p_fabric_construction: opts.fabricConstruction ?? null,
          p_min_nfp: opts.fiber ? 80 : null,
          p_color: opts.color ?? null,
          p_brand_slug: opts.brand ?? null,
          p_search: opts.search ?? null,
          p_min_price: opts.minPrice ?? null,
          p_max_price: opts.maxPrice ?? null,
          p_sort: mapSort(opts.sort),
          p_limit: limit,
          p_offset: offset,
        };

  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) return empty;

  const payload = (data ?? {}) as Record<string, unknown>;
  const products = Array.isArray(payload.products) ? (payload.products as Record<string, unknown>[]) : [];
  return {
    products,
    total: Number(payload.total) || 0,
    hasMore: payload.has_more === true,
    totalStatus: payload.total_status === "exact" ? "exact" : "unavailable",
    rpcVersion:
      (payload.debug as { rpc_version?: string } | undefined)?.rpc_version ?? rpcName,
  };
}

export { TAXONOMY_VERSION };

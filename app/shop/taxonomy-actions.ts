"use server";

import { queryTaxonomyBrowse, type TaxonomyDepartment } from "../../lib/catalog-taxonomy";
import { mapProductRow, type Product } from "../../lib/supabase-server";

export async function getTaxonomyProducts(opts: {
  department: TaxonomyDepartment;
  taxonomySlug: string;
  region?: string;
  fiber?: string;
  color?: string;
  brand?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  materialSubtype?: string;
  fabricConstruction?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  products: Product[];
  total: number;
  hasMore: boolean;
  totalStatus: "exact" | "unavailable";
}> {
  const result = await queryTaxonomyBrowse({
    taxonomySlug: opts.taxonomySlug,
    region: opts.region ?? "us",
    fiber: opts.fiber,
    color: opts.color,
    brand: opts.brand,
    search: opts.search,
    sort: opts.sort,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    materialSubtype: opts.materialSubtype,
    fabricConstruction: opts.fabricConstruction,
    limit: opts.limit ?? 24,
    offset: opts.offset ?? 0,
  });

  return {
    products: result.products.map((row) => mapProductRow(row)),
    total: result.total,
    hasMore: result.hasMore,
    totalStatus: result.totalStatus,
  };
}

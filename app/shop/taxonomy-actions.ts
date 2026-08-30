"use server";

import { queryTaxonomyBrowse, type TaxonomyDepartment, taxonomyLegacyBrowseCategory } from "../../lib/catalog-taxonomy";
import { filterConsumerCatalogProducts } from "../../lib/catalog-consumer-guard";
import {
  filterProductsForIntegrity,
  integritySpecFromBrowseOpts,
} from "../../lib/catalog-filter-integrity";
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

  const mapped = filterConsumerCatalogProducts(
    result.products.map((row) => mapProductRow(row))
  );
  const browseCategory = taxonomyLegacyBrowseCategory(opts.taxonomySlug);
  const integritySpec = integritySpecFromBrowseOpts({
    category: browseCategory,
    fiber: opts.fiber,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    brandSlug: opts.brand,
    color: opts.color,
    materialSubtype: opts.materialSubtype,
    fabricConstruction: opts.fabricConstruction,
    apparelOnly: opts.department === "clothing",
  });
  const filtered = filterProductsForIntegrity(mapped, integritySpec);
  const total =
    !result.hasMore
      ? filtered.length
      : result.total > filtered.length && result.total < filtered.length * 50
        ? result.total
        : filtered.length;

  return {
    products: filtered,
    total,
    hasMore: result.hasMore,
    totalStatus: result.totalStatus,
  };
}

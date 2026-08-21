"use server";

import {
  fetchFootwearCatalogCount,
  fetchFootwearCatalogPage,
} from "../../../lib/footwear-catalog";

export async function getShoesProducts(opts?: {
  limit?: number;
  offset?: number;
  type?: string | null;
  material?: string | null;
}) {
  return fetchFootwearCatalogPage({
    region: "us",
    limit: opts?.limit ?? 24,
    offset: opts?.offset ?? 0,
    type: opts?.type,
    material: opts?.material,
  });
}

export async function getShoesCount(opts?: { type?: string | null; material?: string | null }) {
  return fetchFootwearCatalogCount("us", opts);
}

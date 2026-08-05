"use server";

import {
  fetchFootwearCatalogCount,
  fetchFootwearCatalogPage,
} from "../../../lib/footwear-catalog";

export async function getShoesProducts(opts?: { limit?: number; offset?: number }) {
  return fetchFootwearCatalogPage({
    region: "us",
    limit: opts?.limit ?? 24,
    offset: opts?.offset ?? 0,
  });
}

export async function getShoesCount() {
  return fetchFootwearCatalogCount("us");
}

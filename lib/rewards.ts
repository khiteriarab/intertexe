import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { queryLiveCatalog } from "./catalog-direct-query";

export type RewardsGridProduct = {
  id: string;
  name?: string;
  imageUrl?: string;
  slug?: string;
};

export const getCachedRewardsNewInProducts = unstable_cache(
  async (): Promise<RewardsGridProduct[]> => {
    const result = await queryLiveCatalog({
      region: "us",
      sort: "new",
      limit: 9,
      offset: 0,
      skipCount: true,
    });
    return (result.products || []).slice(0, 9).map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      slug: p.brandSlug,
    }));
  },
  ["rewards-new-in-v1"],
  { revalidate: 3600, tags: ["rewards-new-in"] }
);

export async function incrementScanCount(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase.rpc("increment_scan_count", { p_user_id: userId });
    if (error) console.error("increment_scan_count:", error.message);
  } catch (err) {
    console.error("increment_scan_count:", err);
  }
}

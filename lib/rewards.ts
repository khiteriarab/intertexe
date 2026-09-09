import type { SupabaseClient } from "@supabase/supabase-js";

/** Curated editorial tiles for /rewards — stable local assets, no catalog dependency. */
export const REWARDS_EDITORIAL_TILES = [
  { src: "/editorial-silk.jpg", href: "/materials/silk", alt: "Silk edit" },
  { src: "/editorial-linen.jpg", href: "/materials/linen", alt: "Linen edit" },
  { src: "/editorial-cashmere.jpg", href: "/materials/cashmere", alt: "Cashmere edit" },
  { src: "/editorial-evening.jpg", href: "/collections/evening", alt: "Evening edit" },
  { src: "/editorial-vacation.jpg", href: "/collections/vacation", alt: "Vacation edit" },
  { src: "/fabrics/fabric-wool.jpg", href: "/materials/wool", alt: "Wool edit" },
  { src: "/fabrics/fabric-cotton.jpg", href: "/materials/cotton", alt: "Cotton edit" },
  { src: "/editorial-white-edit.png", href: "/collections/white-edit", alt: "The White Edit" },
  { src: "/hero-editorial-v8-landscape-2400.jpg", href: "/shop?sort=new", alt: "New arrivals" },
] as const;

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

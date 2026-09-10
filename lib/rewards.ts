import type { SupabaseClient } from "@supabase/supabase-js";

/** Curated editorial tiles for /rewards — stable local assets, no catalog dependency. */
export const REWARDS_EDITORIAL_TILES = [
  { src: "/editorial-silk.jpg", href: "/materials/silk", alt: "Silk edit", objectPosition: "center top" },
  { src: "/editorial-linen.jpg", href: "/materials/linen", alt: "Linen edit", objectPosition: "center top" },
  { src: "/editorial-cashmere.jpg", href: "/materials/cashmere", alt: "Cashmere edit", objectPosition: "center top" },
  { src: "/editorial-evening.jpg", href: "/collections/evening", alt: "Evening edit", objectPosition: "center 35%" },
  { src: "/editorial-vacation.jpg", href: "/collections/vacation", alt: "Vacation edit", objectPosition: "center 22%" },
  { src: "/fabrics/fabric-wool.jpg", href: "/materials/wool", alt: "Wool edit", objectPosition: "center top" },
  { src: "/fabrics/fabric-cotton.jpg", href: "/materials/cotton", alt: "Cotton edit", objectPosition: "center top" },
  { src: "/fabrics/fabric-leather.jpg", href: "/collections/leather-edit", alt: "The Leather Edit", objectPosition: "center top" },
  {
    src: "/brands/zimmermann.jpg",
    href: "/shop?sort=new",
    alt: "New arrivals",
    objectPosition: "center 14%",
  },
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

/** Local fabric editorial images — no external URLs. */
export const fabricImages = {
  silk: "/fabrics/fabric-silk.jpg",
  cashmere: "/fabrics/fabric-cashmere.jpg",
  linen: "/fabrics/fabric-linen.jpg",
  wool: "/fabrics/fabric-wool.jpg",
  cotton: "/fabrics/fabric-cotton.jpg",
  leather: "/fabrics/fabric-leather.jpg",
  shoes: "/fabrics/fabric-shoes.jpg",
} as const;

export type FabricImageSlug = keyof typeof fabricImages;

export function fabricImageForSlug(slug: string): string {
  const key = slug as FabricImageSlug;
  return fabricImages[key] ?? fabricImages.silk;
}

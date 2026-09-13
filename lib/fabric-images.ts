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

/** Map normalized fiber codes to editorial fabric swatches when available. */
const FIBER_FABRIC_SLUG: Partial<Record<string, FabricImageSlug>> = {
  cotton: "cotton",
  wool: "wool",
  linen: "linen",
  silk: "silk",
  cashmere: "cashmere",
  leather: "leather",
};

export function fabricImageForFiberCode(fiberCode: string): string | null {
  const slug = FIBER_FABRIC_SLUG[String(fiberCode || "").toLowerCase()];
  return slug ? fabricImages[slug] : null;
}

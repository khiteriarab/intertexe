/** Primary fiber → editorial subtype labels (shop / sale / collection filters). */
export const FIBER_SUBTYPES: Record<string, string[]> = {
  silk: ["Charmeuse", "Chiffon", "Crepe", "Dupioni", "Habotai", "Organza", "Satin", "Taffeta", "Twill", "Velvet"],
  cashmere: ["Fine Knit", "Chunky Knit", "Woven"],
  wool: ["Merino", "Lambswool", "Shetland", "Bouclé", "Tweed", "Flannel", "Crepe", "Jersey"],
  linen: ["Belgian Linen", "Irish Linen", "Stonewashed", "Washed"],
  cotton: ["Poplin", "Oxford", "Twill", "Jersey", "Voile", "Broderie Anglaise", "Denim", "Canvas"],
  leather: ["Nappa", "Suede", "Patent", "Nubuck"],
};

export function fiberSubtypesFor(fiber: string | null | undefined): string[] {
  if (!fiber || fiber === "all") return [];
  return FIBER_SUBTYPES[fiber.toLowerCase()] ?? [];
}

/** Match subtype via DB label, composition, or product name. */
export function productMatchesFiberSubtype(
  product: { name?: string; composition?: string; fiberSubtypeLabel?: string | null },
  subtype: string
): boolean {
  const needle = subtype.trim().toLowerCase();
  if (!needle) return true;
  const label = (product.fiberSubtypeLabel || "").toLowerCase();
  if (label && (label === needle || label.includes(needle))) return true;
  const text = `${product.name || ""} ${product.composition || ""}`.toLowerCase();
  return text.includes(needle);
}

export function filterProductsByFiberSubtypes<T extends { name?: string; composition?: string; fiberSubtypeLabel?: string | null }>(
  products: T[],
  subtypes: string[]
): T[] {
  if (!subtypes.length) return products;
  return products.filter((p) =>
    subtypes.some((st) => productMatchesFiberSubtype(p, st))
  );
}

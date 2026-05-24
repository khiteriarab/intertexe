/** Primary fiber → editorial subtype labels (shop / sale / collection filters). */
export const FIBER_SUBTYPES: Record<string, string[]> = {
  wool: ["Merino", "Cashmere blend", "Lambswool", "Shetland", "Alpaca", "Mohair"],
  cotton: ["Denim", "Poplin", "Jersey", "Oxford", "Chambray"],
  silk: ["Charmeuse", "Chiffon", "Crepe", "Georgette", "Organza", "Satin"],
  linen: ["Belgian linen", "Irish linen", "Stonewashed"],
  cashmere: ["Pure cashmere", "Cashmere blend"],
  leather: ["Full-grain", "Suede", "Lambskin", "Nubuck"],
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

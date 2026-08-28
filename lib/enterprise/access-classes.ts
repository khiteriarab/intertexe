export const ACCESS_CLASSES = [
  "public",
  "economic_operator",
  "supply_chain",
  "repair_recycling",
  "authority",
  "restricted",
  "internal",
] as const;

export type AccessClass = (typeof ACCESS_CLASSES)[number];

/** Fields visible on anonymous public resolver endpoints. */
export const PUBLIC_RESOLVER_CLASSES: ReadonlySet<string> = new Set(["public"]);

export function isPublicAccessClass(accessClass: string | null | undefined): boolean {
  return PUBLIC_RESOLVER_CLASSES.has(String(accessClass || "internal"));
}

export function filterFieldsForAccess<T extends { access_class?: string | null }>(
  fields: T[],
  allowed: ReadonlySet<string> = PUBLIC_RESOLVER_CLASSES
): T[] {
  return fields.filter((field) => allowed.has(String(field.access_class || "internal")));
}

export function accessClassLabel(accessClass: string | null | undefined): string {
  switch (accessClass) {
    case "public":
      return "Public / customer";
    case "economic_operator":
      return "Economic operator";
    case "supply_chain":
      return "Supply-chain partner";
    case "repair_recycling":
      return "Repair / recycling professional";
    case "authority":
      return "Authority / customs";
    case "restricted":
      return "Restricted";
    case "internal":
      return "Internal only";
    default:
      return accessClass || "Internal only";
  }
}

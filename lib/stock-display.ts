/**
 * Consumer-facing stock labels — honest, no blind "in stock" without feed proof.
 * See docs/STOCK_STATUS.md for pipeline + ops.
 */

export type StockDisplayKind = "in_stock" | "low_stock" | "unknown" | "unavailable" | "none";

export function normalizeStockStatus(raw?: string | null): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function stockDisplayKind(raw?: string | null): StockDisplayKind {
  const status = normalizeStockStatus(raw);
  if (!status) return "unknown";
  if (
    status.includes("sold") ||
    status === "out_of_stock" ||
    status === "unavailable" ||
    status === "discontinued"
  ) {
    return "unavailable";
  }
  if (status === "low_stock") return "low_stock";
  if (status === "in_stock") return "in_stock";
  if (status === "unknown") return "unknown";
  return "unknown";
}

export function stockCardBadgeLabel(raw?: string | null): string | null {
  switch (stockDisplayKind(raw)) {
    case "low_stock":
      return "Low stock";
    case "in_stock":
      return "In stock";
    case "unknown":
      return "Check availability";
    default:
      return null;
  }
}

export function stockDetailLine(raw?: string | null): string | null {
  switch (stockDisplayKind(raw)) {
    case "unavailable":
      return "This item appears to be sold out at the retailer.";
    case "low_stock":
      return "Low stock — may sell out soon. Confirm on the retailer site.";
    case "in_stock":
      return "In stock according to the latest retailer feed.";
    case "unknown":
      return "Availability not confirmed in our feed — please check on the retailer site before ordering.";
    default:
      return null;
  }
}

export function schemaOrgAvailability(raw?: string | null): string {
  switch (stockDisplayKind(raw)) {
    case "unavailable":
      return "https://schema.org/OutOfStock";
    case "low_stock":
      return "https://schema.org/LimitedAvailability";
    case "in_stock":
      return "https://schema.org/InStock";
    default:
      return "https://schema.org/LimitedAvailability";
  }
}

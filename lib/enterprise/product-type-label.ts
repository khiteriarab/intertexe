/**
 * Product-type display labels for PDP / catalog UI.
 * Fashion SaaS convention: singular Title Case on the product record ("Jacket"),
 * not plural category buckets ("Jackets").
 */
const PRODUCT_TYPE_ALIASES: Record<string, string> = {
  shirt: "Shirt",
  shirts: "Shirt",
  jacket: "Jacket",
  jackets: "Jacket",
  skirt: "Skirt",
  skirts: "Skirt",
  dress: "Dress",
  dresses: "Dress",
  trousers: "Trousers",
  pants: "Trousers",
  trouser: "Trousers",
  knitwear: "Knitwear",
  sweater: "Knitwear",
  sweaters: "Knitwear",
  beanie: "Beanie",
  beanies: "Beanie",
  accessory: "Accessory",
  accessories: "Accessory",
  "apparel & accessories": "Accessory",
  apparel: "Apparel",
};

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Normalize a stored category into a singular product-type label for UI. */
export function formatProductTypeLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  const trimmed = category.trim();
  if (!trimmed) return null;
  const alias = PRODUCT_TYPE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const lower = trimmed.toLowerCase();
  if (lower.endsWith("ss") || lower.endsWith("us") || lower.endsWith("oes") || lower === "trousers") {
    return titleCase(trimmed);
  }
  if (lower.endsWith("s") && !lower.endsWith("ies")) {
    return titleCase(trimmed.slice(0, -1));
  }
  return titleCase(trimmed);
}

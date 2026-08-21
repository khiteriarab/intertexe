import { SHOP_SHOE_FIBER_OPTIONS, SHOP_SHOE_TYPES, type ShopShoeFiberKey } from "./catalog-filter-options";
import { subcategoryKeywords } from "./catalog-subcategories";

export const SHOE_TYPE_OPTIONS = [...SHOP_SHOE_TYPES];
export const SHOE_MATERIAL_OPTIONS = [...SHOP_SHOE_FIBER_OPTIONS];

export type ShoeMaterialKey = ShopShoeFiberKey;

function norm(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function parseShoeType(raw: string | null | undefined): string | null {
  const value = norm(raw);
  if (!value) return null;
  return SHOE_TYPE_OPTIONS.find((type) => type.toLowerCase() === value) || null;
}

export function parseShoeMaterial(raw: string | null | undefined): ShoeMaterialKey | null {
  const value = norm(raw);
  if (!value || value === "all") return null;
  return SHOE_MATERIAL_OPTIONS.some((opt) => opt.key === value) ? (value as ShoeMaterialKey) : null;
}

function safeIlikeToken(token: string): string | null {
  const cleaned = token.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 3) return null;
  return cleaned;
}

/** Keywords used for live_products_footwear ILIKE. Avoid short tokens like "flat" (matches platform). */
export function shoeTypeSearchTokens(type: string | null | undefined): string[] {
  const parsed = parseShoeType(type);
  if (!parsed) return [];
  if (parsed === "Flats") return ["flats", "ballet", "ballerina"];
  const tokens = subcategoryKeywords(parsed)
    .map((k) => safeIlikeToken(k))
    .filter((k): k is string => Boolean(k));
  return Array.from(new Set(tokens));
}

export function shoeMaterialSearchTokens(material: ShoeMaterialKey | null | undefined): string[] {
  if (!material) return [];
  if (material === "leather") return ["leather", "calfskin", "lambskin", "goatskin", "nappa", "patent"];
  if (material === "suede") return ["suede"];
  if (material === "nubuck") return ["nubuck"];
  if (material === "canvas") return ["canvas"];
  return [];
}

function haystack(product: { name?: string | null; category?: string | null; composition?: string | null }): string {
  return `${product.category || ""} ${product.name || ""} ${product.composition || ""}`.toLowerCase();
}

function hasToken(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

export function shoeMatchesType(
  product: { name?: string | null; category?: string | null; composition?: string | null },
  type: string | null | undefined
): boolean {
  const tokens = shoeTypeSearchTokens(type);
  if (!tokens.length) return true;
  const text = haystack(product);
  return tokens.some((token) => hasToken(text, token) || text.includes(token));
}

export function shoeMatchesMaterial(
  product: { name?: string | null; category?: string | null; composition?: string | null },
  material: ShoeMaterialKey | null | undefined
): boolean {
  const tokens = shoeMaterialSearchTokens(material);
  if (!tokens.length) return true;
  const text = haystack(product);
  return tokens.some((token) => hasToken(text, token) || text.includes(token));
}

export function footwearOrClause(field: "name" | "category" | "composition", tokens: string[]): string {
  return tokens
    .map((token) => `${field}.ilike.%${token}%`)
    .join(",");
}

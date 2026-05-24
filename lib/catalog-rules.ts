/**
 * Shared catalog rules (mirrors lib/catalog-rules.js + Supabase 20240021–20240027).
 */
import {
  garmentTypesForShopCategory,
  materialPrimaryForShopFiber,
  rowMatchesGarmentFilter,
} from "./catalog-shop-mappings";

export {
  garmentTypesForShopCategory,
  materialPrimaryForShopFiber,
  rowMatchesGarmentFilter,
};

export { CATALOG_INITIAL_PAGE, CATALOG_PAGE_SIZE } from "./catalog-constants";

export function classifyMaterial(composition = "", _materialMetadata?: unknown): string {
  const blob = String(composition || "").toLowerCase();
  if (!blob.trim()) return "unknown_material";
  if (/(silk|mulberry)/.test(blob)) return "silk";
  if (/cashmere/.test(blob)) return "cashmere";
  if (/(wool|merino|lambswool|alpaca)/.test(blob)) return "wool";
  if (/(linen|flax)/.test(blob)) return "linen";
  if (/cotton/.test(blob)) return "cotton";
  if (/(leather|suede)/.test(blob)) return "leather_suede";
  if (/(viscose|rayon|cupro|modal|lyocell|tencel)/.test(blob)) return "viscose_rayon";
  if (/(polyester|nylon|acrylic|elastane|spandex|polyamide)/.test(blob)) return "synthetic_blend";
  return "unknown_material";
}

export function classifyGarment(category = "", name = ""): string {
  const cat = String(category || "").toLowerCase().trim();
  const nam = String(name || "").toLowerCase().trim();
  if (!cat && !nam) return "needs_review";
  if (/(dress|gown)/.test(cat) || /(dress|gown)/.test(nam)) return "dresses";
  if (/(blouse|bodysuit|tank|camisole)/.test(cat) || /(blouse|bodysuit)/.test(nam)) return "tops_blouses";
  if (/(^|[^a-z])top([^a-z]|$)/.test(cat) || /( tank top| camisole)/.test(nam)) return "tops_blouses";
  if (/shirt/.test(cat) && !/t-shirt/.test(cat)) return "shirts";
  if (/knit/.test(cat) && !/(sweater|cardigan)/.test(cat)) return "knitwear";
  if (/(sweater|cardigan|pullover|jumper)/.test(cat)) return "sweaters_cardigans";
  if (/(pant|trouser|jean|denim)/.test(cat)) return "pants_trousers";
  if (/skirt/.test(cat)) return "skirts";
  if (/short/.test(cat)) return "shorts";
  if (/(blazer|jacket)/.test(cat)) return "jackets_blazers";
  if (/(coat|outerwear|parka|trench|anorak)/.test(cat)) return "coats";
  if (/(swim|bikini|resort)/.test(cat)) return "swim_resortwear";
  if (/(scarf|wrap|shawl)/.test(cat) || /(scarf|wrap|shawl)/.test(nam)) return "scarves_wraps";
  if (!cat) return "needs_review";
  return "other_apparel";
}

export function consumerExclusionReason(row: {
  category?: string;
  name?: string;
  composition?: string;
  image_url?: string;
  imageUrl?: string;
  price?: string;
  url?: string;
}): string | null {
  const imageUrl = row.image_url ?? row.imageUrl;
  if (!imageUrl || !String(imageUrl).trim()) return "missing_image";
  const priceText = String(row.price || "").trim().toLowerCase();
  if (!priceText || ["n/a", "na", "0", "0.00", "$0", "$0.00"].includes(priceText)) return "missing_price";
  if (!row.url || !/^https?:\/\//i.test(String(row.url).trim())) return "missing_url";
  if (!row.composition || !String(row.composition).trim()) return "missing_composition";

  const cat = String(row.category || "").toLowerCase();
  const nam = String(row.name || "").toLowerCase();
  if (/(shoe|footwear|sandal|boot|sneaker|heel|pump|loafer|mule)/.test(cat) || /(shoe|sandal|boot|sneaker|heel|pump|loafer|mule)/.test(nam)) return "shoes";
  if (/(bag|handbag|tote|clutch|pouch|wallet|backpack)/.test(cat) || /(handbag|tote bag|clutch)/.test(nam)) return "bags";
  if (/(jewelry|jewellery|earring|necklace|bracelet|brooch)/.test(cat)) return "jewelry";
  if (cat.includes("watch") || nam.includes(" watch ")) return "watches";
  if (/(belt|scarf|hat|cap|glove|sunglass|eyewear|accessory|accessories)/.test(cat)) return "accessories";
  if ((cat.includes("mens") || cat.startsWith("men") || nam.includes(" for men") || nam.includes(" mens "))
    && !cat.includes("women") && !nam.includes("women")) return "mens";
  const brandSlug = String((row as { brand_slug?: string; brandSlug?: string }).brand_slug
    || (row as { brandSlug?: string }).brandSlug || "").toLowerCase();
  if (brandSlug && /^(orlebar-brown|orlebarbrown|canali|hackett)/.test(brandSlug)) return "mens";
  if (/\b(polo\s+shirt|dress\s+shirt|men'?s\s+polo)\b/.test(nam) && !/\bwomen'?s\b/.test(nam + cat)) return "mens";
  if (/(kid|kids|child|children|girl|boy|baby|infant)/.test(cat)) return "kids";
  if (/(beauty|fragrance|perfume|makeup|skincare|cosmetic|home|decor|furniture|candle)/.test(cat)) return "beauty_home";
  return null;
}

export function offerCompletenessStatus(row: Record<string, unknown>): string {
  if (consumerExclusionReason(row as Parameters<typeof consumerExclusionReason>[0])) return "excluded";
  if (!row.currency || !String(row.currency).trim()) return "needs_review";
  if (classifyMaterial(String(row.composition || "")) === "unknown_material") return "needs_review";
  if (classifyGarment(String(row.category || ""), String(row.name || "")) === "needs_review") return "needs_review";
  return "complete";
}

export function rowMatchesShopFiber(fiber: string | null | undefined, row: Record<string, unknown>): boolean {
  const f = String(fiber || "").toLowerCase().trim();
  if (!f || f === "all") return true;
  const mat = classifyMaterial(String(row.composition || ""));
  const cat = String(row.category || "").toLowerCase();
  const nam = String(row.name || "").toLowerCase();
  const comp = String(row.composition || "").toLowerCase();
  if (["denim", "jeans", "jean"].includes(f)) {
    return /(denim|jean)/.test(cat) || /(denim|jean)/.test(nam) || /(denim|jean)/.test(comp);
  }
  const mapped = materialPrimaryForShopFiber(f);
  if (mapped) return mat === mapped;
  return comp.includes(f) || cat.includes(f) || nam.includes(f);
}

export function normTokenCatalog(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Strip color suffixes so regional/color variants dedupe to one style. */
export function catalogStyleBaseName(name: string): string {
  return String(name || "")
    .replace(
      /\s*[-–]\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum|powder|midnight|heather|medium|deep|light|dark|washed|faded|natural|stone|oatmeal|chalk|pearl|snow).*$/i,
      ""
    )
    .trim()
    .toLowerCase();
}

export function catalogNormalizeImageUrl(pImageUrl: string | null | undefined): string | null {
  if (!pImageUrl) return null;
  const trimmed = String(pImageUrl).split("#")[0].split("?")[0].trim().toLowerCase();
  return trimmed || null;
}

export function catalogDedupeKey(row: Record<string, unknown>): string {
  const b = normTokenCatalog(String(row.brand_name ?? row.brandName ?? ""));
  const style = normTokenCatalog(
    catalogStyleBaseName(String(row.name ?? row.title ?? ""))
  );
  if (b && style.length >= 6) return `style:${b}|${style}`;
  const pid = String(row.product_id ?? row.productId ?? "").trim().toLowerCase();
  if (pid) return `pid:${pid}`;
  const img = catalogNormalizeImageUrl((row.image_url ?? row.imageUrl) as string);
  if (img) return `img:${img}`;
  const n = normTokenCatalog(String(row.name ?? ""));
  const c = normTokenCatalog(String(row.composition ?? ""));
  if (b && n && c) return `identity:${b}|${n}|${c}`;
  return `id:${row.id}`;
}

export function catalogRegionRank(region: string | null | undefined, preferred: string): number {
  const r = String(region || "us").toLowerCase();
  const p = String(preferred || "us").toLowerCase();
  if (r === p) return 0;
  if (r === "us") return 1;
  if (r === "uk") return 2;
  if (r === "eu") return 3;
  return 4;
}

export function pickDedupeWinner(rows: Record<string, unknown>[], preferred = "us", fallback = "us") {
  return [...rows].sort((a, b) => {
    const d = catalogRegionRank(a.region as string, preferred) - catalogRegionRank(b.region as string, preferred);
    if (d !== 0) return d;
    const df = catalogRegionRank(a.region as string, fallback) - catalogRegionRank(b.region as string, fallback);
    if (df !== 0) return df;
    const nfp = Number(b.natural_fiber_percent || 0) - Number(a.natural_fiber_percent || 0);
    if (nfp !== 0) return nfp;
    return new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime();
  })[0];
}

export function dedupeCatalogRows(rows: Record<string, unknown>[], preferred = "us", fallback = "us") {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = catalogDedupeKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.values()).map((g) => pickDedupeWinner(g, preferred, fallback));
}

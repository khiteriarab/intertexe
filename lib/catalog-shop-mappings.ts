/** Shop/materials URL slugs → DB garment_type enums (see catalog_shop_category_garment_types). */
export const SHOP_CATEGORY_GARMENT_TYPES: Record<string, string[]> = {
  apparel: [
    "dresses",
    "tops_blouses",
    "shirts",
    "knitwear",
    "sweaters_cardigans",
    "pants_trousers",
    "shorts",
    "coats",
    "jackets_blazers",
    "skirts",
    "swim_resortwear",
    "lingerie",
    "sleepwear",
    "other_apparel",
  ],
  clothing: [
    "dresses",
    "tops_blouses",
    "shirts",
    "knitwear",
    "sweaters_cardigans",
    "pants_trousers",
    "shorts",
    "coats",
    "jackets_blazers",
    "skirts",
    "swim_resortwear",
    "lingerie",
    "sleepwear",
    "other_apparel",
  ],
  dresses: ["dresses"],
  tops: ["tops_blouses", "shirts"],
  shirts: ["shirts"],
  blouses: ["tops_blouses"],
  tanks: ["tops_blouses", "shirts"],
  knitwear: ["knitwear", "sweaters_cardigans"],
  trousers: ["pants_trousers"],
  jeans: ["pants_trousers"],
  bottoms: ["pants_trousers"],
  pants: ["pants_trousers"],
  outerwear: ["coats", "jackets_blazers"],
  coats: ["coats"],
  jackets: ["jackets_blazers"],
  skirts: ["skirts"],
  // Hard category: never map to other_apparel (that bucket is polluted with Footwear).
  jumpsuits: ["jumpsuits"],
  "matching-sets": ["matching_sets"],
  sleepwear: ["sleepwear"],
  swimwear: ["swim_resortwear"],
  lingerie: ["lingerie"],
  shoes: ["shoes"],
  bags: ["bags", "handbags"],
  shorts: ["shorts"],
};

/** Alias for direct-query layer. */
export const CATEGORY_TO_GARMENT_TYPE = SHOP_CATEGORY_GARMENT_TYPES;

/** Name/category keywords required for coarse buckets (hard AND, not preference). */
export const SHOP_CATEGORY_TEXT_KEYWORDS: Record<string, string[]> = {
  jumpsuits: ["jumpsuit", "romper", "playsuit", "overall", "boilersuit"],
  sleepwear: [
    "pajama",
    "pyjama",
    "nightgown",
    "nightdress",
    "sleepshirt",
    "sleep shirt",
    "sleep set",
    "nightwear",
    "nightshirt",
    "loungewear",
  ],
  dresses: ["dress", "gown", "kaftan", "caftan"],
  shirts: ["shirt"],
  blouses: ["blouse"],
  tanks: ["tank", "camisole", "cami"],
  trousers: ["pant", "trouser", "slack", "chino", "legging", "culotte"],
  jeans: ["jean", "denim"],
  shorts: ["short"],
  coats: ["coat", "trench", "parka", "overcoat"],
  jackets: ["jacket", "blazer"],
  "matching-sets": ["matching set", "co-ord", "coord", "two piece", "two-piece"],
  lingerie: ["lingerie", "underwear", "bra", "bralette", "brief", "panty", "thong"],
  shoes: ["shoe", "sandal", "boot", "sneaker", "loafer", "heel", "pump", "mule", "espadrille"],
  bags: ["bag", "tote", "handbag", "clutch", "purse", "backpack"],
};

export type JeansListingRow = {
  name?: string | null;
  category?: string | null;
  composition?: string | null;
  fabric_construction?: string | null;
  fabricConstruction?: string | null;
  material_subtype?: string | null;
  materialSubtype?: string | null;
};

const JEAN_NAME_RE = /\b(jeans?|denim)\b/i;
const NON_DENIM_BOTTOM_RE =
  /\b(linen|terry|chino|cargo|jogger|legging|culotte|palazzo|slack|sweatpant|track pant|trackpant|fleece|lounge)\b/i;

/** Jeans PLP — require jean/denim in the product itself; never category breadcrumb alone. */
export function productMatchesJeansListing(row: JeansListingRow): boolean {
  const name = (row.name || "").toLowerCase();
  const composition = (row.composition || "").toLowerCase();
  const fabricConstruction = (
    row.fabric_construction ||
    row.fabricConstruction ||
    ""
  ).toLowerCase();
  const materialSubtype = (row.material_subtype || row.materialSubtype || "").toLowerCase();

  if (NON_DENIM_BOTTOM_RE.test(name) || /\bfrench[\s-]?terry\b/.test(name)) {
    return false;
  }
  if (/\b(trouser|sweat\s*pant|sweatpant|track\s*pant|lounge\s*pant)\b/.test(name)) {
    return false;
  }
  if (/\bpants\b/.test(name) && !JEAN_NAME_RE.test(name) && !/\bdenim\b/.test(composition)) {
    return false;
  }

  const nameHasJean = JEAN_NAME_RE.test(name);
  const fabricIsDenim =
    fabricConstruction === "denim" ||
    materialSubtype.includes("denim") ||
    /\bdenim\b/.test(composition);

  return nameHasJean || fabricIsDenim;
}

/** Lingerie PLP — exclude skirts misfiled via substring `slip` (e.g. slip skirt). */
export function productMatchesLingerieListing(row: {
  name?: string | null;
  category?: string | null;
}): boolean {
  const cat = (row.category || "").toLowerCase();
  const name = (row.name || "").toLowerCase();
  if (/\bskirt\b/.test(name) || /\b(trouser|pants|jeans?)\b/.test(name)) return false;
  if (/(lingerie|underwear|intimate)/.test(cat)) return true;
  if (/\b(lingerie|underwear|bralette|thong|brief|panty|knicker|corset)\b/.test(name)) return true;
  if (/\bbra\b/.test(name)) return true;
  if (/\bbikini\b/.test(name)) {
    if (/(lingerie|underwear|intimate)/.test(cat)) return true;
    if (cat === "swimwear" && !/(swim|beach|resort|pool)/.test(name)) return true;
  }
  if (/\bslip\b/.test(name)) return true;
  return false;
}

const FOOTWEAR_TEXT_RE =
  /\b(shoe|shoes|footwear|sandal|sandals|boot|boots|bootie|booties|sneaker|sneakers|heel|heels|pump|pumps|loafer|loafers|mule|mules|wedge|wedges|espadrille|espadrilles|trainer|trainers|slide|slides|flip[- ]?flop)\b/i;

/** Collection slugs used as shop-style category filters in sale/shop APIs. */
const COLLECTION_CATEGORY_GARMENT_TYPES: Record<string, string[]> = {
  "linen-clothing": ["dresses", "tops_blouses", "pants_trousers", "skirts", "jackets_blazers"],
  "silk-clothing": ["dresses", "tops_blouses", "skirts", "jackets_blazers"],
  "cashmere-clothing": ["knitwear", "sweaters_cardigans", "jackets_blazers", "coats"],
  "cotton-clothing": ["dresses", "tops_blouses", "pants_trousers"],
};

export function applyCategoryFilter(query: any, category: string): any {
  const key = category.toLowerCase();
  const garmentTypes =
    SHOP_CATEGORY_GARMENT_TYPES[key] ?? COLLECTION_CATEGORY_GARMENT_TYPES[key];
  if (garmentTypes?.length) {
    let q = query.in("garment_type", garmentTypes);
    // Jumpsuits: also require name/category keyword so residual mislabels cannot leak.
    if (key === "jumpsuits") {
      q = q.or(
        "name.ilike.%jumpsuit%,category.ilike.%jumpsuit%,name.ilike.%romper%,category.ilike.%romper%,name.ilike.%playsuit%,category.ilike.%playsuit%,name.ilike.%overall%,category.ilike.%overall%,name.ilike.%boilersuit%,category.ilike.%boilersuit%"
      );
    }
    if (key === "sleepwear") {
      q = q.or(
        "name.ilike.%pajama%,name.ilike.%pyjama%,name.ilike.%nightgown%,name.ilike.%nightdress%,name.ilike.%sleepshirt%,name.ilike.%sleep shirt%,name.ilike.%sleep set%,name.ilike.%nightwear%,category.ilike.%sleepwear%,category.ilike.%pajama%,category.ilike.%pyjama%"
      );
    }
    if (key === "jeans") {
      // Name / fabric only — category.ilike.%jean% leaks linen & terry from "Pants & Jeans" departments.
      q = q.or("name.ilike.%jean%,name.ilike.%denim%,fabric_construction.eq.denim");
      return q;
    }
    const keywords = SHOP_CATEGORY_TEXT_KEYWORDS[key];
    if (keywords?.length && !["jumpsuits", "sleepwear"].includes(key)) {
      const orClause = keywords
        .flatMap((k) => [`name.ilike.%${k}%`, `category.ilike.%${k}%`])
        .join(",");
      q = q.or(orClause);
    }
    return q;
  }
  const needle = category.toLowerCase();
  return query.or(`name.ilike.%${needle}%,category.ilike.%${needle}%`);
}

/** Post-RPC integrity gate — never ship category-wrong rows. */
export function productMatchesHardCategory(
  row: {
    category?: string | null;
    name?: string | null;
    garment_type?: string | null;
    composition?: string | null;
    fabric_construction?: string | null;
    fabricConstruction?: string | null;
    material_subtype?: string | null;
    materialSubtype?: string | null;
  },
  category?: string | null
): boolean {
  if (!category || category === "all" || category === "clothing" || category === "apparel") {
    // Apparel PLPs must still exclude footwear.
    return !isFootwearText(`${row.category || ""} ${row.name || ""}`);
  }
  const key = category.toLowerCase();
  const text = `${row.category || ""} ${row.name || ""}`.toLowerCase();
  if (key !== "shoes" && isFootwearText(text)) return false;
  if (key === "jeans") {
    return productMatchesJeansListing(row);
  }
  if (key === "lingerie") {
    return productMatchesLingerieListing(row);
  }
  const keywords = SHOP_CATEGORY_TEXT_KEYWORDS[key];
  if (keywords?.length) {
    if (key === "shirts" && /\b(blouse|t-shirt|tee|pajama|pyjama)\b/.test(text)) return false;
    if (!keywords.some((k) => text.includes(k))) return false;
  }
  const types = garmentTypesForShopCategory(key);
  if (types?.length) {
    const gt = String(row.garment_type || "").toLowerCase();
    if (gt && !types.includes(gt) && keywords?.length) {
      // Allow keyword-matched rows when garment_type is stale or coarse.
      return keywords.some((k) => text.includes(k));
    }
  }
  return true;
}

function isFootwearText(text: string): boolean {
  if (/\b(belt|wallet|purse|clutch|handbag|tote|backpack|scarf|glove)\b/i.test(text)) {
    return false;
  }
  return FOOTWEAR_TEXT_RE.test(text);
}

export const SHOP_FIBER_TO_MATERIAL: Record<string, string> = {
  silk: "silk",
  linen: "linen",
  cotton: "cotton",
  wool: "wool",
  cashmere: "cashmere",
  "leather-suede": "leather_suede",
  leather_suede: "leather_suede",
};

export function garmentTypesForShopCategory(category?: string | null): string[] | null {
  if (!category || category === "all") return null;
  return SHOP_CATEGORY_GARMENT_TYPES[category.toLowerCase()] ?? null;
}

export function materialPrimaryForShopFiber(fiber?: string | null): string | null {
  if (!fiber || fiber === "all") return null;
  const f = fiber.toLowerCase();
  if (f === "denim" || f === "jeans" || f === "jean") return null;
  return SHOP_FIBER_TO_MATERIAL[f] ?? f;
}

export function rowMatchesGarmentFilter(
  row: {
    garment_type?: string | null;
    category?: string | null;
    name?: string | null;
    composition?: string | null;
    fabric_construction?: string | null;
    fabricConstruction?: string | null;
    material_subtype?: string | null;
    materialSubtype?: string | null;
  },
  category?: string | null
): boolean {
  const types = garmentTypesForShopCategory(category);
  const key = String(category || "").toLowerCase();
  if (key === "jeans") {
    return productMatchesJeansListing(row);
  }
  if (key === "lingerie") {
    return productMatchesLingerieListing(row);
  }
  if (!types?.length) return true;
  const gt = (row.garment_type || "").toLowerCase();
  if (types.includes(gt)) return true;
  const keywords = SHOP_CATEGORY_TEXT_KEYWORDS[key];
  if (keywords?.length) {
    const text = `${row.category || ""} ${row.name || ""}`.toLowerCase();
    if (key === "shirts" && /\b(blouse|t-shirt|tee|pajama|pyjama)\b/.test(text)) return false;
    return keywords.some((k) => text.includes(k));
  }
  return false;
}

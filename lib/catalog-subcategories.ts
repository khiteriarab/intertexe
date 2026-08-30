import { SHOP_SHOE_TYPES } from "./catalog-filter-options";
import { productMatchesJeansListing } from "./catalog-shop-mappings";

export type CatalogSubcategoryMap = Record<string, string[]>;

export const CATEGORY_SUBCATEGORY_OPTIONS: CatalogSubcategoryMap = {
  shoes: [...SHOP_SHOE_TYPES],
  dresses: ["Midi Dresses", "Maxi Dresses", "Mini Dresses", "Shirt Dresses", "Wrap Dresses", "Gowns"],
  tops: ["Blouses", "T-Shirts", "Shirts", "Camisoles", "Bodysuits", "Tunics"],
  shirts: ["Shirts"],
  tanks: ["Tanks", "Camisoles"],
  knitwear: ["Sweaters", "Cardigans", "Turtlenecks", "Hoodies"],
  trousers: ["Trousers", "Jeans", "Shorts", "Leggings", "Culottes"],
  skirts: ["Midi Skirts", "Mini Skirts", "Maxi Skirts", "Pencil Skirts"],
  outerwear: ["Coats", "Blazers", "Jackets", "Trench Coats", "Puffers", "Capes"],
  swimwear: ["Bikinis", "One-Pieces", "Cover-Ups"],
};

export function subcategoryKeywords(label: string): string[] {
  const sub = label.toLowerCase();
  switch (sub) {
    case "boots": return ["boot", "bootie", "ankle boot", "knee boot", "chelsea boot", "combat boot"];
    case "sandals": return ["sandal", "slide", "flip flop", "thong"];
    case "heels": return ["heel", "pump", "stiletto"];
    case "sneakers": return ["sneaker", "trainer"];
    case "loafers": return ["loafer", "moccasin"];
    case "flats": return ["flat", "ballet flat", "ballerina"];
    case "mules": return ["mule"];
    case "espadrilles": return ["espadrille"];
    case "midi dresses": return ["midi dress", "midi"];
    case "maxi dresses": return ["maxi dress", "maxi"];
    case "mini dresses": return ["mini dress", "mini"];
    case "shirt dresses": return ["shirt dress", "shirtdress"];
    case "wrap dresses": return ["wrap dress", "wrap"];
    case "gowns": return ["gown", "evening gown"];
    case "blouses": return ["blouse"];
    case "t-shirts": return ["t-shirt", "tee", "tshirt"];
    case "shirts": return ["shirt"];
    case "camisoles": return ["camisole", "cami"];
    case "bodysuits": return ["bodysuit"];
    case "tunics": return ["tunic"];
    case "sweaters": return ["sweater", "jumper", "pullover"];
    case "cardigans": return ["cardigan"];
    case "turtlenecks": return ["turtleneck", "roll neck", "rollneck"];
    case "hoodies": return ["hoodie", "hoody", "sweatshirt"];
    case "trousers": return ["trouser", "pant", "slack", "chino"];
    case "jeans": return ["jean", "denim"];
    case "shorts": return ["short"];
    case "leggings": return ["legging"];
    case "culottes": return ["culotte"];
    case "midi skirts": return ["midi skirt", "midi"];
    case "mini skirts": return ["mini skirt", "mini"];
    case "maxi skirts": return ["maxi skirt", "maxi"];
    case "pencil skirts": return ["pencil skirt", "pencil"];
    case "coats": return ["coat", "overcoat"];
    case "blazers": return ["blazer"];
    case "jackets": return ["jacket"];
    case "trench coats": return ["trench"];
    case "puffers": return ["puffer", "parka", "anorak", "down"];
    case "capes": return ["cape", "poncho"];
    case "bikinis": return ["bikini"];
    case "one-pieces": return ["one-piece", "one piece", "swimsuit"];
    case "cover-ups": return ["cover-up", "coverup", "kaftan", "sarong"];
    default: return [sub.replace(/s$/, "")];
  }
}

export function productMatchesSubcategory(
  product: {
    category?: string | null;
    name?: string | null;
    materialSubtype?: string | null;
    fabricConstruction?: string | null;
    composition?: string | null;
  },
  subcategory: string
): boolean {
  if (subcategory.toLowerCase() === "jeans") {
    return productMatchesJeansListing({
      name: product.name,
      category: product.category,
      composition: product.composition,
      fabricConstruction: product.fabricConstruction,
      materialSubtype: product.materialSubtype,
    });
  }
  const keywords = subcategoryKeywords(subcategory);
  if (!keywords.length) return true;
  const text = [
    product.category || "",
    product.name || "",
    product.materialSubtype || "",
    product.fabricConstruction || "",
    product.composition || "",
  ]
    .join(" ")
    .toLowerCase();
  return keywords.some((k) => text.includes(k));
}

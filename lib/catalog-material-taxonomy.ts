/**
 * Shared material taxonomy — Phase 1.
 * Prefer Supabase `catalog_material_taxonomy`; fall back to baked-in seed.
 * Kinds: material_subtype | fabric_construction | material_finish
 */

export type ShopMaterialFamily =
  | "wool"
  | "cashmere"
  | "silk"
  | "cotton"
  | "linen"
  | "leather";

export type TaxonomyKind =
  | "shop_family"
  | "material_subtype"
  | "fabric_construction"
  | "material_finish";

export type TaxonomyEntry = {
  id: string;
  family: ShopMaterialFamily;
  kind: TaxonomyKind;
  slug: string;
  label: string;
  sortOrder: number;
  aliases: string[];
  requireExplicit: boolean;
  enabled: boolean;
  /** Education URL slug (e.g. sea-island-cotton). */
  educationSlug?: string | null;
  fiberPrimary?: string | null;
  shortDescription?: string | null;
  filterEnabled?: boolean;
  educationEnabled?: boolean;
  featuredInEducation?: boolean;
  rareMaterial?: boolean;
  relatedSlugs?: string[];
};

/** Shop catalog params derived from a taxonomy record. */
export type TaxonomyShopRoute = {
  shopMaterialFamily: ShopMaterialFamily;
  /** Catalog fiber query param (leather → leather_suede for legacy APIs). */
  fiberSlug: string;
  materialSubtype: string | null;
  fabricConstruction: string | null;
  educationSlug: string;
  title: string;
  shortDescription: string | null;
};

export function catalogFiberSlug(family: ShopMaterialFamily): string {
  return family === "leather" ? "leather_suede" : family;
}

export function shopRouteForTaxonomyEntry(entry: TaxonomyEntry): TaxonomyShopRoute {
  const educationSlug = entry.educationSlug || entry.slug.replace(/_/g, "-");
  if (entry.kind === "shop_family") {
    return {
      shopMaterialFamily: entry.family,
      fiberSlug: catalogFiberSlug(entry.family),
      materialSubtype: null,
      fabricConstruction: null,
      educationSlug,
      title: entry.label,
      shortDescription: entry.shortDescription ?? null,
    };
  }
  if (entry.kind === "fabric_construction") {
    return {
      shopMaterialFamily: entry.family,
      fiberSlug: catalogFiberSlug(entry.family),
      materialSubtype: null,
      fabricConstruction: entry.slug,
      educationSlug,
      title: entry.label,
      shortDescription: entry.shortDescription ?? null,
    };
  }
  // material_subtype | material_finish (Phase 1 leather finishes still shop via subtype/composition)
  return {
    shopMaterialFamily: entry.family,
    fiberSlug: catalogFiberSlug(entry.family),
    materialSubtype: entry.slug,
    fabricConstruction: null,
    educationSlug,
    title: entry.label,
    shortDescription: entry.shortDescription ?? null,
  };
}

export function findTaxonomyByEducationSlug(
  entries: TaxonomyEntry[],
  educationSlug: string
): TaxonomyEntry | null {
  const key = educationSlug.trim().toLowerCase().replace(/_/g, "-");
  if (!key) return null;
  return (
    entries.find(
      (e) =>
        e.enabled &&
        (e.educationSlug?.toLowerCase() === key ||
          e.slug.replace(/_/g, "-") === key ||
          e.slug === key.replace(/-/g, "_"))
    ) || null
  );
}

export function findTaxonomyByShopSelection(
  entries: TaxonomyEntry[],
  opts: {
    family?: string | null;
    materialSubtype?: string | null;
    fabricConstruction?: string | null;
  }
): TaxonomyEntry | null {
  const family = normalizeShopFamily(opts.family);
  if (opts.fabricConstruction) {
    const needle = opts.fabricConstruction.toLowerCase();
    const hit = entries.find(
      (e) =>
        e.enabled &&
        e.educationEnabled &&
        e.kind === "fabric_construction" &&
        (!family || e.family === family) &&
        (e.slug === needle || e.label.toLowerCase() === needle)
    );
    if (hit) return hit;
  }
  if (opts.materialSubtype) {
    const needle = opts.materialSubtype.toLowerCase();
    const hit = entries.find(
      (e) =>
        e.enabled &&
        e.educationEnabled &&
        (e.kind === "material_subtype" || e.kind === "material_finish") &&
        (!family || e.family === family) &&
        (e.slug === needle ||
          e.label.toLowerCase() === needle ||
          e.aliases.some((a) => a.toLowerCase() === needle))
    );
    if (hit) return hit;
  }
  if (family) {
    return (
      entries.find(
        (e) => e.enabled && e.educationEnabled && e.kind === "shop_family" && e.family === family
      ) || null
    );
  }
  return null;
}

export function rareAndHiddenEntries(entries: TaxonomyEntry[]): TaxonomyEntry[] {
  return entries
    .filter(
      (e) =>
        e.enabled &&
        e.educationEnabled &&
        e.featuredInEducation &&
        e.rareMaterial
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function relatedEducationEntries(
  entries: TaxonomyEntry[],
  entry: TaxonomyEntry
): TaxonomyEntry[] {
  const related = entry.relatedSlugs || [];
  if (!related.length) return [];
  return related
    .map(
      (slug) =>
        entries.find(
          (e) =>
            e.enabled &&
            e.educationEnabled &&
            (e.slug === slug || e.educationSlug === slug)
        ) || null
    )
    .filter((e): e is TaxonomyEntry => e != null);
}

/** Build /shop query string from a taxonomy shop route. */
export function shopHrefForRoute(route: TaxonomyShopRoute): string {
  const params = new URLSearchParams();
  params.set("fiber", route.fiberSlug === "leather_suede" ? "leather" : route.fiberSlug);
  // Prefer leather family key used by web shop tabs when applicable
  if (route.fiberSlug === "leather_suede") {
    params.set("fiber", "leather");
  }
  if (route.materialSubtype) params.set("materialSubtype", route.materialSubtype);
  if (route.fabricConstruction) params.set("fabricConstruction", route.fabricConstruction);
  return `/shop?${params.toString()}`;
}

/** Normalize shop fiber keys (e.g. leather_suede) to taxonomy family. */
export function normalizeShopFamily(
  family: string | null | undefined
): ShopMaterialFamily | null {
  const f = (family || "").toLowerCase().replace(/-/g, "_");
  if (!f || f === "all") return null;
  if (f === "leather_suede" || f === "leather") return "leather";
  if (
    f === "wool" ||
    f === "cashmere" ||
    f === "silk" ||
    f === "cotton" ||
    f === "linen"
  ) {
    return f;
  }
  return null;
}

/** Customer-facing section title for the subtype axis. */
export function materialTypeSectionTitle(family: string | null | undefined): string {
  switch (normalizeShopFamily(family)) {
    case "wool":
      return "Wool Type";
    case "cashmere":
      return "Cashmere Type";
    case "silk":
      return "Silk Type";
    case "cotton":
      return "Cotton Type";
    case "linen":
      return "Linen Type";
    case "leather":
      return "Leather Type";
    default:
      return "Type";
  }
}

/** Phase 1 Leather Type UI: subtypes + finishes (finishes later move to material_finish-only UI). */
export function typeOptionsForFamily(
  entries: TaxonomyEntry[],
  family: string | null | undefined
): TaxonomyEntry[] {
  const f = normalizeShopFamily(family);
  if (!f) return [];
  const kinds: TaxonomyKind[] =
    f === "leather"
      ? ["material_subtype", "material_finish"]
      : ["material_subtype"];
  return entries
    .filter(
      (e) =>
        e.enabled &&
        e.filterEnabled !== false &&
        e.family === f &&
        kinds.includes(e.kind)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function constructionOptionsForFamily(
  entries: TaxonomyEntry[],
  family: string | null | undefined
): TaxonomyEntry[] {
  const f = normalizeShopFamily(family);
  if (!f) return [];
  return entries
    .filter(
      (e) =>
        e.enabled &&
        e.filterEnabled !== false &&
        e.family === f &&
        e.kind === "fabric_construction"
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function normalizeMaterialToken(
  entries: TaxonomyEntry[],
  raw: string,
  opts?: { family?: string; kind?: TaxonomyKind }
): TaxonomyEntry | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  const pool = entries.filter((e) => {
    if (!e.enabled) return false;
    if (opts?.family && e.family !== opts.family) return false;
    if (opts?.kind && e.kind !== opts.kind) return false;
    return true;
  });
  for (const e of pool) {
    if (e.slug === needle || e.label.toLowerCase() === needle) return e;
    if (e.aliases.some((a) => a.toLowerCase() === needle)) return e;
  }
  for (const e of pool) {
    if (e.aliases.some((a) => needle.includes(a.toLowerCase()))) {
      if (e.requireExplicit) {
        // Must contain a specific alias token, not just "silk"
        if (e.aliases.some((a) => needle.includes(a.toLowerCase()) && a.toLowerCase() !== "silk")) {
          return e;
        }
        continue;
      }
      return e;
    }
  }
  return null;
}

/** Baked-in seed — mirrors supabase migrations (taxonomy + education bridge). */
export const FALLBACK_MATERIAL_TAXONOMY: TaxonomyEntry[] = [
  // Shop family hubs
  { id: "fam-silk", family: "silk", kind: "shop_family", slug: "silk", label: "Silk", sortOrder: 1, aliases: ["silk"], requireExplicit: false, enabled: true, educationSlug: "silk", fiberPrimary: "silk", shortDescription: "Fluid. Luminous. Timeless.", filterEnabled: true, educationEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "fam-cashmere", family: "cashmere", kind: "shop_family", slug: "cashmere", label: "Cashmere", sortOrder: 1, aliases: ["cashmere"], requireExplicit: false, enabled: true, educationSlug: "cashmere", fiberPrimary: "cashmere", shortDescription: "The finest natural insulation.", filterEnabled: true, educationEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "fam-linen", family: "linen", kind: "shop_family", slug: "linen", label: "Linen", sortOrder: 1, aliases: ["linen", "flax"], requireExplicit: false, enabled: true, educationSlug: "linen", fiberPrimary: "linen", shortDescription: "Breathable. Textural. Essential.", filterEnabled: true, educationEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "fam-wool", family: "wool", kind: "shop_family", slug: "wool", label: "Wool", sortOrder: 1, aliases: ["wool"], requireExplicit: false, enabled: true, educationSlug: "wool", fiberPrimary: "wool", shortDescription: "Structure and warmth, naturally.", filterEnabled: true, educationEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "fam-cotton", family: "cotton", kind: "shop_family", slug: "cotton", label: "Cotton", sortOrder: 1, aliases: ["cotton"], requireExplicit: false, enabled: true, educationSlug: "cotton", fiberPrimary: "cotton", shortDescription: "Pure comfort. Every day.", filterEnabled: true, educationEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "fam-leather", family: "leather", kind: "shop_family", slug: "leather", label: "Leather", sortOrder: 1, aliases: ["leather", "suede"], requireExplicit: false, enabled: true, educationSlug: "leather_suede", fiberPrimary: "leather", shortDescription: "Natural. Enduring. Exceptional.", filterEnabled: true, educationEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  // Wool subtypes
  { id: "wool-ms-merino", family: "wool", kind: "material_subtype", slug: "merino_wool", label: "Merino Wool", sortOrder: 10, aliases: ["merino", "merino wool", "extra-fine merino", "extra fine merino", "superfine merino"], requireExplicit: false, enabled: true, educationSlug: "merino", educationEnabled: true, filterEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-ms-lambswool", family: "wool", kind: "material_subtype", slug: "lambswool", label: "Lambswool", sortOrder: 20, aliases: ["lambswool", "lamb's wool", "lambs wool"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-ms-virgin", family: "wool", kind: "material_subtype", slug: "virgin_wool", label: "Virgin Wool", sortOrder: 30, aliases: ["virgin wool"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-ms-shetland", family: "wool", kind: "material_subtype", slug: "shetland_wool", label: "Shetland Wool", sortOrder: 40, aliases: ["shetland", "shetland wool"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-ms-alpaca", family: "wool", kind: "material_subtype", slug: "alpaca", label: "Alpaca", sortOrder: 50, aliases: ["alpaca", "baby alpaca"], requireExplicit: false, enabled: true, educationSlug: "alpaca", fiberPrimary: "alpaca", shortDescription: "Andean fiber — soft, warm, and lanolin-free.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["vicuna", "camel", "cashmere"] },
  { id: "wool-ms-guanaco", family: "wool", kind: "material_subtype", slug: "guanaco", label: "Guanaco", sortOrder: 55, aliases: ["guanaco"], requireExplicit: false, enabled: true, educationSlug: "guanaco", fiberPrimary: "guanaco", shortDescription: "Wild cousin of the alpaca — ultra-fine Andean camelid fiber.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["alpaca", "vicuna", "camel"] },
  { id: "wool-ms-mohair", family: "wool", kind: "material_subtype", slug: "mohair", label: "Mohair", sortOrder: 60, aliases: ["mohair", "kid mohair"], requireExplicit: false, enabled: true, educationSlug: "mohair", fiberPrimary: "mohair", shortDescription: "Lustrous halo from the Angora goat.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["alpaca", "cashmere"] },
  { id: "wool-ms-vicuna", family: "wool", kind: "material_subtype", slug: "vicuna", label: "Vicuña", sortOrder: 70, aliases: ["vicuna", "vicuña"], requireExplicit: false, enabled: true, educationSlug: "vicuna", fiberPrimary: "vicuna", shortDescription: "An exceptionally fine South American animal fiber prized for its softness, warmth and scarcity.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["alpaca", "cashmere", "qiviut", "guanaco"] },
  { id: "wool-ms-camel", family: "wool", kind: "material_subtype", slug: "camel", label: "Camel", sortOrder: 80, aliases: ["camel", "camel hair", "camel wool", "baby camel"], requireExplicit: false, enabled: true, educationSlug: "camel", fiberPrimary: "camel", shortDescription: "Soft undercoat from Bactrian camels — lightweight natural insulation.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["cashmere", "yak", "qiviut"] },
  { id: "wool-ms-yak", family: "wool", kind: "material_subtype", slug: "yak", label: "Yak", sortOrder: 90, aliases: ["yak", "yak wool"], requireExplicit: false, enabled: true, educationSlug: "yak", fiberPrimary: "yak", shortDescription: "High-altitude yak down — warmth without weight.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["camel", "qiviut", "cashmere"] },
  { id: "wool-ms-qiviut", family: "wool", kind: "material_subtype", slug: "qiviut", label: "Qiviut", sortOrder: 100, aliases: ["qiviut", "qiviuq"], requireExplicit: false, enabled: true, educationSlug: "qiviut", fiberPrimary: "qiviut", shortDescription: "Musk ox undercoat — eight times warmer than sheep's wool by weight.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["cashmere", "vicuna", "yak", "camel"] },
  // Wool constructions
  { id: "wool-fc-jersey", family: "wool", kind: "fabric_construction", slug: "jersey", label: "Jersey", sortOrder: 10, aliases: ["jersey"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-boucle", family: "wool", kind: "fabric_construction", slug: "boucle", label: "Bouclé", sortOrder: 20, aliases: ["boucle", "bouclé"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-gabardine", family: "wool", kind: "fabric_construction", slug: "gabardine", label: "Gabardine", sortOrder: 30, aliases: ["gabardine"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-flannel", family: "wool", kind: "fabric_construction", slug: "flannel", label: "Flannel", sortOrder: 40, aliases: ["flannel"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-felt", family: "wool", kind: "fabric_construction", slug: "felt", label: "Felt", sortOrder: 50, aliases: ["felt"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-twill", family: "wool", kind: "fabric_construction", slug: "twill", label: "Twill", sortOrder: 60, aliases: ["twill"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-herringbone", family: "wool", kind: "fabric_construction", slug: "herringbone", label: "Herringbone", sortOrder: 70, aliases: ["herringbone"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-boiled", family: "wool", kind: "fabric_construction", slug: "boiled_wool", label: "Boiled Wool", sortOrder: 80, aliases: ["boiled wool"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-tweed", family: "wool", kind: "fabric_construction", slug: "tweed", label: "Tweed", sortOrder: 90, aliases: ["tweed"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "wool-fc-crepe", family: "wool", kind: "fabric_construction", slug: "crepe", label: "Crepe", sortOrder: 100, aliases: ["crepe", "crêpe"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  // Silk subtypes
  { id: "silk-ms-mulberry", family: "silk", kind: "material_subtype", slug: "mulberry_silk", label: "Mulberry Silk", sortOrder: 10, aliases: ["mulberry silk", "mulberry"], requireExplicit: true, enabled: true, educationSlug: "mulberry-silk", educationEnabled: true, filterEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-ms-tussah", family: "silk", kind: "material_subtype", slug: "tussah_silk", label: "Tussah Silk", sortOrder: 20, aliases: ["tussah", "tussah silk", "tussar", "tussar silk"], requireExplicit: true, enabled: true, educationSlug: "tussah-silk", educationEnabled: true, filterEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-ms-eri", family: "silk", kind: "material_subtype", slug: "eri_silk", label: "Eri Silk", sortOrder: 30, aliases: ["eri", "eri silk"], requireExplicit: true, enabled: true, educationSlug: "eri-silk", educationEnabled: true, filterEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["mulberry_silk", "tussah_silk", "muga_silk"] },
  { id: "silk-ms-muga", family: "silk", kind: "material_subtype", slug: "muga_silk", label: "Muga Silk", sortOrder: 40, aliases: ["muga", "muga silk"], requireExplicit: true, enabled: true, educationSlug: "muga-silk", educationEnabled: true, filterEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["mulberry_silk", "tussah_silk", "eri_silk"] },
  // Silk constructions
  { id: "silk-fc-charmeuse", family: "silk", kind: "fabric_construction", slug: "charmeuse", label: "Charmeuse", sortOrder: 10, aliases: ["charmeuse"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-chiffon", family: "silk", kind: "fabric_construction", slug: "chiffon", label: "Chiffon", sortOrder: 20, aliases: ["chiffon"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-crepe", family: "silk", kind: "fabric_construction", slug: "crepe", label: "Crepe", sortOrder: 30, aliases: ["crepe", "crêpe", "crepe de chine"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-dupioni", family: "silk", kind: "fabric_construction", slug: "dupioni", label: "Dupioni", sortOrder: 40, aliases: ["dupioni", "dupion"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-habotai", family: "silk", kind: "fabric_construction", slug: "habotai", label: "Habotai", sortOrder: 50, aliases: ["habotai", "habutai"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-organza", family: "silk", kind: "fabric_construction", slug: "organza", label: "Organza", sortOrder: 60, aliases: ["organza"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-satin", family: "silk", kind: "fabric_construction", slug: "satin", label: "Satin", sortOrder: 70, aliases: ["satin"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-taffeta", family: "silk", kind: "fabric_construction", slug: "taffeta", label: "Taffeta", sortOrder: 80, aliases: ["taffeta"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-twill", family: "silk", kind: "fabric_construction", slug: "twill", label: "Twill", sortOrder: 90, aliases: ["twill"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "silk-fc-velvet", family: "silk", kind: "fabric_construction", slug: "velvet", label: "Velvet", sortOrder: 100, aliases: ["velvet"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  // Cotton
  { id: "cotton-ms-sea-island", family: "cotton", kind: "material_subtype", slug: "sea_island_cotton", label: "Sea Island Cotton", sortOrder: 10, aliases: ["sea island", "sea-island", "sea island cotton"], requireExplicit: false, enabled: true, educationSlug: "sea-island-cotton", fiberPrimary: "cotton", shortDescription: "The rarest long-staple cotton, historically grown in the Caribbean.", filterEnabled: true, educationEnabled: true, featuredInEducation: true, rareMaterial: true, relatedSlugs: ["supima_cotton", "egyptian_cotton", "pima_cotton"] },
  { id: "cotton-ms-supima", family: "cotton", kind: "material_subtype", slug: "supima_cotton", label: "Supima Cotton", sortOrder: 20, aliases: ["supima", "supima cotton"], requireExplicit: false, enabled: true, educationSlug: "supima-cotton", educationEnabled: true, filterEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-ms-egyptian", family: "cotton", kind: "material_subtype", slug: "egyptian_cotton", label: "Egyptian Cotton", sortOrder: 30, aliases: ["egyptian cotton"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-ms-pima", family: "cotton", kind: "material_subtype", slug: "pima_cotton", label: "Pima Cotton", sortOrder: 40, aliases: ["pima", "pima cotton"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-ms-organic", family: "cotton", kind: "material_subtype", slug: "organic_cotton", label: "Organic Cotton", sortOrder: 50, aliases: ["organic cotton", "gots"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-poplin", family: "cotton", kind: "fabric_construction", slug: "poplin", label: "Poplin", sortOrder: 10, aliases: ["poplin"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-oxford", family: "cotton", kind: "fabric_construction", slug: "oxford", label: "Oxford", sortOrder: 20, aliases: ["oxford"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-twill", family: "cotton", kind: "fabric_construction", slug: "twill", label: "Twill", sortOrder: 30, aliases: ["twill"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-jersey", family: "cotton", kind: "fabric_construction", slug: "jersey", label: "Jersey", sortOrder: 40, aliases: ["jersey"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-voile", family: "cotton", kind: "fabric_construction", slug: "voile", label: "Voile", sortOrder: 50, aliases: ["voile"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-denim", family: "cotton", kind: "fabric_construction", slug: "denim", label: "Denim", sortOrder: 60, aliases: ["denim"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cotton-fc-canvas", family: "cotton", kind: "fabric_construction", slug: "canvas", label: "Canvas", sortOrder: 70, aliases: ["canvas"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  // Linen
  { id: "linen-ms-belgian", family: "linen", kind: "material_subtype", slug: "belgian_linen", label: "Belgian Linen", sortOrder: 10, aliases: ["belgian linen"], requireExplicit: false, enabled: true, educationSlug: "belgian-linen", educationEnabled: true, filterEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "linen-ms-irish", family: "linen", kind: "material_subtype", slug: "irish_linen", label: "Irish Linen", sortOrder: 20, aliases: ["irish linen"], requireExplicit: false, enabled: true, educationSlug: "irish-linen", educationEnabled: true, filterEnabled: true, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "linen-mf-washed", family: "linen", kind: "material_finish", slug: "washed", label: "Washed", sortOrder: 10, aliases: ["washed linen", "washed"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "linen-mf-stonewashed", family: "linen", kind: "material_finish", slug: "stonewashed", label: "Stonewashed", sortOrder: 20, aliases: ["stonewashed", "stonewashed linen"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  // Cashmere constructions
  { id: "cashmere-fc-woven", family: "cashmere", kind: "fabric_construction", slug: "woven", label: "Woven", sortOrder: 10, aliases: ["woven"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "cashmere-fc-knitted", family: "cashmere", kind: "fabric_construction", slug: "knitted", label: "Knitted", sortOrder: 20, aliases: ["knitted", "knit"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  // Leather subtypes + finishes
  { id: "leather-ms-lambskin", family: "leather", kind: "material_subtype", slug: "lambskin", label: "Lambskin", sortOrder: 10, aliases: ["lambskin"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-ms-calfskin", family: "leather", kind: "material_subtype", slug: "calfskin", label: "Calfskin", sortOrder: 20, aliases: ["calfskin", "calf leather"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-ms-goatskin", family: "leather", kind: "material_subtype", slug: "goatskin", label: "Goatskin", sortOrder: 30, aliases: ["goatskin"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-ms-deerskin", family: "leather", kind: "material_subtype", slug: "deerskin", label: "Deerskin", sortOrder: 40, aliases: ["deerskin"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-ms-full-grain", family: "leather", kind: "material_subtype", slug: "full_grain", label: "Full-Grain", sortOrder: 50, aliases: ["full-grain", "full grain"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-ms-top-grain", family: "leather", kind: "material_subtype", slug: "top_grain", label: "Top-Grain", sortOrder: 60, aliases: ["top-grain", "top grain"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-ms-bonded", family: "leather", kind: "material_subtype", slug: "bonded", label: "Bonded", sortOrder: 70, aliases: ["bonded leather", "bonded"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-mf-nappa", family: "leather", kind: "material_finish", slug: "nappa", label: "Nappa", sortOrder: 10, aliases: ["nappa"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-mf-suede", family: "leather", kind: "material_finish", slug: "suede", label: "Suede", sortOrder: 20, aliases: ["suede"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-mf-nubuck", family: "leather", kind: "material_finish", slug: "nubuck", label: "Nubuck", sortOrder: 30, aliases: ["nubuck"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-mf-patent", family: "leather", kind: "material_finish", slug: "patent", label: "Patent", sortOrder: 40, aliases: ["patent", "patent leather"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
  { id: "leather-mf-pebbled", family: "leather", kind: "material_finish", slug: "pebbled", label: "Pebbled", sortOrder: 50, aliases: ["pebbled"], requireExplicit: false, enabled: true, filterEnabled: true, educationEnabled: false, featuredInEducation: false, rareMaterial: false, relatedSlugs: [] },
];

let cachedTaxonomy: TaxonomyEntry[] | null = null;
let cachedAt = 0;
const TTL_MS = 10 * 60 * 1000;

export async function loadMaterialTaxonomy(
  fetchRows?: () => Promise<TaxonomyEntry[] | null>
): Promise<TaxonomyEntry[]> {
  if (cachedTaxonomy && Date.now() - cachedAt < TTL_MS) return cachedTaxonomy;
  try {
    const remote = fetchRows ? await fetchRows() : null;
    if (remote && remote.length) {
      cachedTaxonomy = remote;
      cachedAt = Date.now();
      return remote;
    }
  } catch {
    // fall through
  }
  cachedTaxonomy = FALLBACK_MATERIAL_TAXONOMY;
  cachedAt = Date.now();
  return FALLBACK_MATERIAL_TAXONOMY;
}

/** Match product against materialSubtype slug (normalized column first, then text). */
export function productMatchesMaterialSubtype(
  product: {
    name?: string | null;
    composition?: string | null;
    materialSubtype?: string | null;
    materialSubtypeLabel?: string | null;
  },
  slugOrLabel: string,
  entries: TaxonomyEntry[] = FALLBACK_MATERIAL_TAXONOMY
): boolean {
  const needle = slugOrLabel.trim().toLowerCase();
  if (!needle) return true;
  const entry =
    entries.find((e) => e.slug === needle || e.label.toLowerCase() === needle) ||
    normalizeMaterialToken(entries, needle);

  if (product.materialSubtype) {
    const col = product.materialSubtype.toLowerCase();
    if (entry && col === entry.slug) return true;
    if (col === needle) return true;
  }
  if (product.materialSubtypeLabel) {
    const label = product.materialSubtypeLabel.toLowerCase();
    if (entry && label === entry.label.toLowerCase()) return true;
    if (label.includes(needle)) return true;
  }

  const text = `${product.name || ""} ${product.composition || ""}`.toLowerCase();
  if (entry) {
    if (entry.requireExplicit) {
      return entry.aliases.some((a) => text.includes(a.toLowerCase()));
    }
    return entry.aliases.some((a) => text.includes(a.toLowerCase())) || text.includes(entry.slug.replace(/_/g, " "));
  }
  return text.includes(needle);
}

export function productMatchesFabricConstruction(
  product: {
    name?: string | null;
    composition?: string | null;
    fabricConstruction?: string | null;
  },
  slugOrLabel: string,
  entries: TaxonomyEntry[] = FALLBACK_MATERIAL_TAXONOMY
): boolean {
  const needle = slugOrLabel.trim().toLowerCase();
  if (!needle) return true;
  const entry =
    entries.find(
      (e) =>
        e.kind === "fabric_construction" &&
        (e.slug === needle || e.label.toLowerCase() === needle)
    ) || normalizeMaterialToken(entries, needle, { kind: "fabric_construction" });

  if (product.fabricConstruction) {
    const col = product.fabricConstruction.toLowerCase();
    if (entry && col === entry.slug) return true;
    if (col === needle) return true;
  }
  const text = `${product.name || ""} ${product.composition || ""}`.toLowerCase();
  if (entry) {
    return entry.aliases.some((a) => text.includes(a.toLowerCase()));
  }
  return text.includes(needle);
}

/** @deprecated Use typeOptionsForFamily — kept for transitional imports */
export function fiberSubtypesFor(fiber: string | null | undefined): string[] {
  return typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, fiber).map((e) => e.label);
}

/**
 * @deprecated Prefer catalog-material-taxonomy.ts
 * Thin adapters so existing ShopClient / sidebar imports keep working during Phase 1.
 */
import {
  typeOptionsForFamily,
  productMatchesMaterialSubtype,
  FALLBACK_MATERIAL_TAXONOMY,
  constructionOptionsForFamily,
  materialTypeSectionTitle,
  loadMaterialTaxonomy,
  fiberSubtypesFor,
} from "./catalog-material-taxonomy";

export {
  fiberSubtypesFor,
  typeOptionsForFamily,
  constructionOptionsForFamily,
  materialTypeSectionTitle,
  FALLBACK_MATERIAL_TAXONOMY,
  loadMaterialTaxonomy,
};

export const productMatchesFiberSubtype = productMatchesMaterialSubtype;

export function filterProductsByFiberSubtypes<
  T extends {
    name?: string;
    composition?: string;
    fiberSubtypeLabel?: string | null;
    materialSubtype?: string | null;
    materialSubtypeLabel?: string | null;
  }
>(products: T[], subtypes: string[]): T[] {
  if (!subtypes.length) return products;
  return products.filter((p) =>
    subtypes.some((st) =>
      productMatchesMaterialSubtype(
        {
          name: p.name,
          composition: p.composition,
          materialSubtype: p.materialSubtype,
          materialSubtypeLabel: p.materialSubtypeLabel ?? p.fiberSubtypeLabel,
        },
        st,
        FALLBACK_MATERIAL_TAXONOMY
      )
    )
  );
}

/** Legacy map — prefer taxonomy table. */
export const FIBER_SUBTYPES: Record<string, string[]> = {
  silk: typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, "silk").map((e) => e.label),
  cashmere: typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, "cashmere").map((e) => e.label),
  wool: typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, "wool").map((e) => e.label),
  linen: typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, "linen").map((e) => e.label),
  cotton: typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, "cotton").map((e) => e.label),
  leather: typeOptionsForFamily(FALLBACK_MATERIAL_TAXONOMY, "leather").map((e) => e.label),
};

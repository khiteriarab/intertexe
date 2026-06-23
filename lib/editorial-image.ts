/**
 * Section-aware editorial imagery — frames use globals.css cover-fill rules.
 */

export type EditorialImageSection =
  | "hero-banner"
  | "editorial-panel"
  | "brand-tile"
  | "collection-hero"
  | "collection-grid";

export type EditorialFocalHints = {
  slug?: string;
  title?: string;
  category?: string;
  name?: string;
};

export function editorialFrameClass(section: EditorialImageSection): string {
  switch (section) {
    case "hero-banner":
      return "editorial-frame-hero";
    case "editorial-panel":
      return "editorial-frame-panel";
    case "brand-tile":
      return "editorial-frame-brand";
    case "collection-hero":
      return "editorial-frame-collection-hero";
    case "collection-grid":
      return "relative w-full overflow-hidden bg-[#f5f4f2] aspect-[3/4]";
    default:
      return "editorial-frame-panel";
  }
}

/** Object-position classes for product/catalog grids (pairs with object-cover). */
export function editorialFocalClass(hints?: EditorialFocalHints): string {
  const mod = editorialFocalModifier(hints);
  if (mod.includes("--top")) return "object-[center_22%]";
  if (mod.includes("--lower")) return "object-[center_72%]";
  if (mod.includes("--mid")) return "object-[center_35%]";
  return "object-center";
}

export function editorialFocalModifier(hints?: EditorialFocalHints): string {
  const text = `${hints?.slug || ""} ${hints?.title || ""} ${hints?.category || ""} ${hints?.name || ""}`.toLowerCase();

  if (/\b(dress|gown|evening|silk|blouse|top|swim|bikini)\b/.test(text)) {
    return "editorial-cover-img--top";
  }
  if (/\b(pant|trouser|jean|denim|skirt|short|shoe|bag)\b/.test(text)) {
    return "editorial-cover-img--lower";
  }
  if (/\b(vacation|resort|beach|linen|summer|coastal|hero|banner)\b/.test(text)) {
    return "editorial-cover-img--mid";
  }
  return "";
}

export function editorialImageClass(
  section: EditorialImageSection,
  hints?: EditorialFocalHints,
  opts?: { hoverZoom?: boolean }
): string {
  const forceTop = section === "collection-hero" || section === "collection-grid" || section === "hero-banner";
  const focal = forceTop
    ? "editorial-cover-img--top"
    : section === "brand-tile"
      ? "editorial-cover-img--top"
      : editorialFocalModifier(hints);
  return [
    "editorial-cover-img",
    focal,
    opts?.hoverZoom ? "editorial-cover-img--zoom" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function editorialSectionFromVariant(
  variant: "banner" | "panel" | "collection"
): EditorialImageSection {
  if (variant === "banner") return "hero-banner";
  if (variant === "panel") return "editorial-panel";
  return "collection-hero";
}

/**
 * Section-aware editorial imagery — luxury layouts use cover + focal positioning,
 * not one universal contain rule.
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

/** Frame / aspect ratio per surface (NAP / Mytheresa–style). */
export function editorialFrameClass(section: EditorialImageSection): string {
  switch (section) {
    case "hero-banner":
      return [
        "relative w-full overflow-hidden bg-[#eae8e4]",
        "aspect-[5/6] min-h-[min(88vh,900px)]",
        "md:aspect-[21/9] md:min-h-[min(72vh,780px)]",
      ].join(" ");
    case "editorial-panel":
      return "relative w-full overflow-hidden bg-[#eae8e4] aspect-[4/5] max-h-[min(86vh,760px)]";
    case "brand-tile":
      return "relative w-full overflow-hidden bg-[#e8e6e2] aspect-[3/4]";
    case "collection-hero":
      return [
        "relative w-full overflow-hidden bg-[#eae8e4]",
        "aspect-[5/6] min-h-[min(70vh,680px)]",
        "md:aspect-[2/1] md:min-h-[min(58vh,600px)]",
      ].join(" ");
    case "collection-grid":
      return "relative w-full overflow-hidden bg-[#f5f4f2] aspect-[3/4]";
    default:
      return "relative w-full overflow-hidden bg-[#eae8e4] aspect-[3/4]";
  }
}

/** Smart vertical focal point from editorial slug / category copy. */
export function editorialFocalClass(hints?: EditorialFocalHints): string {
  const text = `${hints?.slug || ""} ${hints?.title || ""} ${hints?.category || ""} ${hints?.name || ""}`.toLowerCase();

  if (/\b(shoe|boot|sandal|sneaker|bag|handbag|tote)\b/.test(text)) {
    return "object-[center_55%]";
  }
  if (/\b(pant|trouser|jean|denim|skirt|short)\b/.test(text)) {
    return "object-[center_42%]";
  }
  if (/\b(dress|gown|evening|silk|blouse|top|swim|bikini)\b/.test(text)) {
    return "object-[center_24%]";
  }
  if (/\b(vacation|resort|beach|linen|summer|coastal)\b/.test(text)) {
    return "object-[center_36%]";
  }
  if (/\b(tailor|blazer|coat|outer|wool|cashmere)\b/.test(text)) {
    return "object-[center_38%]";
  }
  if (/\b(hero|banner|campaign)\b/.test(text)) {
    return "object-[center_32%] md:object-[center_38%]";
  }

  return "object-[center_30%]";
}

export function editorialImageClass(
  section: EditorialImageSection,
  hints?: EditorialFocalHints,
  opts?: { hoverZoom?: boolean }
): string {
  const focal =
    section === "hero-banner"
      ? `${editorialFocalClass(hints)} md:object-[center_38%]`
      : editorialFocalClass(hints);

  return [
    "absolute inset-0 w-full h-full object-cover",
    focal,
    opts?.hoverZoom ? "group-hover:scale-[1.03] transition-transform duration-[1100ms] ease-out" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Map legacy EditorialHeroImage variant names → section keys. */
export function editorialSectionFromVariant(
  variant: "banner" | "panel" | "collection"
): EditorialImageSection {
  if (variant === "banner") return "hero-banner";
  if (variant === "panel") return "editorial-panel";
  return "collection-hero";
}

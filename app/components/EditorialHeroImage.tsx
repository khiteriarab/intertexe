/**
 * Context-aware editorial imagery — hero, panels, and collection heroes.
 */

import {
  editorialFrameClass,
  editorialImageClass,
  editorialSectionFromVariant,
  type EditorialFocalHints,
} from "../../lib/editorial-image";

export type EditorialHeroVariant = "panel" | "collection" | "banner";

type Props = EditorialFocalHints & {
  src: string;
  alt: string;
  variant?: EditorialHeroVariant;
  className?: string;
  hoverZoom?: boolean;
};

export function EditorialHeroImage({
  src,
  alt,
  variant = "panel",
  className = "",
  hoverZoom = false,
  slug,
  title,
}: Props) {
  const section = editorialSectionFromVariant(variant);
  const frame = editorialFrameClass(section);
  const imgClass = editorialImageClass(section, { slug, title }, { hoverZoom });

  return (
    <div className={`${frame} ${className}`} data-editorial-hero={variant} data-editorial-section={section}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={imgClass}
          loading={variant === "banner" ? "eager" : "lazy"}
          fetchPriority={variant === "banner" ? "high" : undefined}
          draggable={false}
        />
      ) : null}
    </div>
  );
}

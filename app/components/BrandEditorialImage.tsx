"use client";

import { useState } from "react";
import { editorialFrameClass, editorialImageClass } from "../../lib/editorial-image";

/** Homepage “Brands we love” tiles — NAP-style cover cards. */
export function BrandEditorialImage({
  src,
  alt,
  slug,
  hoverZoom = true,
  onFailed,
}: {
  src: string;
  alt: string;
  slug?: string;
  hoverZoom?: boolean;
  onFailed?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div className={editorialFrameClass("brand-tile")} data-editorial-section="brand-tile">
      <img
        src={src}
        alt={alt}
        className={editorialImageClass("brand-tile", { slug }, { hoverZoom })}
        loading="eager"
        onError={() => {
          setFailed(true);
          onFailed?.();
        }}
        draggable={false}
      />
    </div>
  );
}

"use client";

import {
  catalogImageObjectClass,
  catalogImageSizes,
  type CatalogImageVariant,
} from "../../lib/catalog-image";

export function CatalogProductImage({
  src,
  alt,
  variant = "product-card",
  category,
  name,
  eager,
  className = "",
}: {
  src: string;
  alt: string;
  variant?: CatalogImageVariant;
  category?: string;
  name?: string;
  eager?: boolean;
  className?: string;
}) {
  const { aspect } = catalogImageSizes(variant);
  const objectClass = catalogImageObjectClass(variant, { category, name });

  return (
    <div className={`relative overflow-hidden bg-[#f5f5f3] ${aspect} ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full ${objectClass} transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        draggable={false}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import ProductImageSkeleton from "./ProductImageSkeleton";
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
  sizes: _sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
}: {
  src: string;
  alt: string;
  variant?: CatalogImageVariant;
  category?: string;
  name?: string;
  eager?: boolean;
  className?: string;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setActiveSrc(src);
  }, [src]);

  const { aspect } = catalogImageSizes(variant);
  const objectClass = catalogImageObjectClass(variant, { category, name });

  return (
    <div className={`relative overflow-hidden bg-[#f5f5f3] ${aspect} ${className}`}>
      {!loaded && !failed && <ProductImageSkeleton />}
      {failed && <ProductImageSkeleton />}

      {!failed && activeSrc && (
        // Native img — faster first paint than Next/Image for external CDN URLs.
        <img
          src={activeSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (activeSrc !== src && src) {
              setActiveSrc(src);
              return;
            }
            setFailed(true);
          }}
          className={`absolute inset-0 w-full h-full ${objectClass} transition-opacity duration-300 ease-out group-hover:scale-[1.03] transition-transform duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          draggable={false}
        />
      )}
    </div>
  );
}

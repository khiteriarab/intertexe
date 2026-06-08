"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
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
  const [error, setError] = useState(false);
  const { aspect } = catalogImageSizes(variant);
  const objectClass = catalogImageObjectClass(variant, { category, name });

  return (
    <div className={`relative overflow-hidden bg-[#1C2B2A] ${aspect} ${className}`}>
      {!loaded && !error && <ProductImageSkeleton />}
      {error && <ProductImageSkeleton />}

      {!error && (
        <Image
          src={src}
          alt={alt}
          fill
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`absolute inset-0 w-full h-full ${objectClass} object-cover transition-opacity duration-300 ease-out group-hover:scale-[1.03] transition-transform duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={eager ? "eager" : "lazy"}
          sizes={sizes}
          draggable={false}
        />
      )}
    </div>
  );
}

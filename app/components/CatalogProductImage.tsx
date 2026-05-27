"use client";

import Image from "next/image";
import {
  catalogImageObjectClass,
  catalogImageSizes,
  type CatalogImageVariant,
} from "../../lib/catalog-image";
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

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
      <Image
        src={src}
        alt={alt}
        fill
        className={`absolute inset-0 w-full h-full ${objectClass} transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
        loading={eager ? "eager" : "lazy"}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        draggable={false}
      />
    </div>
  );
}

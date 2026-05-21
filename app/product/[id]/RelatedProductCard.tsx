"use client";

import { ProductLink } from "../../components/ProductLink";
import { ProductCardHeart } from "./ProductFavoriteButton";
import { formatDisplayPrice } from "../../../lib/format-display-price";

type RelatedProduct = {
  id: string;
  brandName: string;
  name: string;
  imageUrl: string;
  price?: string;
  naturalFiberPercent?: number | null;
  listingRegion?: string | null;
  productId?: string;
};

export function RelatedProductCard({ product }: { product: RelatedProduct }) {
  const imageSrc =
    product.imageUrl +
    (product.imageUrl?.includes("cdn.shopify.com")
      ? (product.imageUrl.includes("?") ? "&" : "?") + "width=400"
      : "");

  return (
    <ProductLink
      href={`/product/${product.id}`}
      className="group flex flex-col shrink-0 w-[42vw] md:w-[22%]"
      data-testid={`related-product-${product.id}`}
    >
      <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
        <img
          src={imageSrc}
          alt={product.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 pointer-events-none"
          loading="lazy"
        />
        {product.naturalFiberPercent != null && product.naturalFiberPercent >= 90 && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
              {product.naturalFiberPercent}% Natural
            </span>
          </div>
        )}
        <ProductCardHeart productId={String(product.id)} />
      </div>
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{product.brandName}</span>
        <span className="text-[11px] md:text-xs text-muted-foreground truncate">{product.name}</span>
        {product.price && <span className="text-[11px] md:text-xs">{formatDisplayPrice(product)}</span>}
      </div>
    </ProductLink>
  );
}

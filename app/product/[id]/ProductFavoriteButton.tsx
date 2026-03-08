"use client";

import { Heart } from "lucide-react";
import { useProductFavorites } from "../../hooks/use-product-favorites";

export function ProductFavoriteButton({ productId }: { productId: string }) {
  const { favorites, toggle } = useProductFavorites();
  const isFav = favorites.has(productId);

  return (
    <button
      onClick={() => toggle(productId)}
      className="flex items-center justify-center gap-2.5 w-full border border-border/60 px-6 py-3.5 uppercase tracking-[0.15em] text-[10px] md:text-xs hover:border-foreground transition-colors active:scale-[0.98]"
      data-testid="button-favorite-product"
      aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
      {isFav ? "Saved to Wishlist" : "Add to Wishlist"}
    </button>
  );
}

export function ProductCardHeart({ productId }: { productId: string }) {
  const { favorites, toggle } = useProductFavorites();
  const isFav = favorites.has(productId);

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
      className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
      data-testid={`btn-fav-${productId}`}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-foreground/70"}`} />
    </button>
  );
}

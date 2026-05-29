"use client";

import { ExternalLink } from "lucide-react";

const TOKEN_KEY = "intertexe_auth_token";

type ShopNowProduct = {
  id: string | number;
  brandName?: string | null;
  brand_name?: string | null;
  name?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  price?: string | number | null;
  currency?: string | null;
  naturalFiberPercent?: number | null;
  natural_fiber_percent?: number | null;
};

async function recordClickOut(product: ShopNowProduct) {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) return;

  const brandName = product.brandName ?? product.brand_name ?? null;
  const imageUrl = product.imageUrl ?? product.image_url ?? null;
  const naturalFiberPercent =
    product.naturalFiberPercent ?? product.natural_fiber_percent ?? null;

  try {
    const res = await fetch("/api/account/product-clickout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: String(product.id),
        brandName,
        productName: product.name ?? null,
        productUrl: product.url ?? null,
        imageUrl,
        price: product.price ?? null,
        currency: product.currency ?? null,
        naturalFiberPercent,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("Click-out failed:", body.message ?? res.statusText);
      return;
    }
    console.log("Click-out recorded");
  } catch (err) {
    console.error("Click-out failed:", err);
  }
}

export function ShopNowButton({ product }: { product: ShopNowProduct }) {
  const shopUrl = product.url;
  if (!shopUrl) return null;

  return (
    <>
      <a
        href={shopUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void recordClickOut(product);
        }}
        className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-4 uppercase tracking-[0.2em] text-xs font-medium hover:opacity-90 transition-opacity active:scale-[0.98]"
        data-testid="link-shop-now"
      >
        Shop Now <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <p
        className="text-xs text-muted-foreground mt-3 leading-relaxed"
        data-testid="text-affiliate-disclosure"
      >
        Intertexe earns a commission when you purchase through our links. This is how we keep the
        platform free.
      </p>
    </>
  );
}

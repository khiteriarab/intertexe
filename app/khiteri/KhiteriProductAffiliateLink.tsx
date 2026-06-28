"use client";

import type { ReactNode } from "react";
import type { KhiterisEditProduct } from "../../lib/khiteris-edit";
import { trackAffiliateClick } from "../../lib/analytics";
import { getOrCreateSessionId } from "../../lib/session";

function parsePrice(price: string): number {
  const value = parseFloat(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

async function recordKhiteriClickout(params: {
  editSlug: string;
  editMonth: string;
  product: KhiterisEditProduct;
  clickTarget: "image" | "title";
}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("intertexe_auth_token") : null;

  try {
    await fetch("/api/khiteri/track-clickout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        editSlug: params.editSlug,
        editMonth: params.editMonth,
        productSlot: params.product.id,
        productName: params.product.name,
        brandName: params.product.brand,
        affiliateUrl: params.product.href,
        clickTarget: params.clickTarget,
        sessionId: getOrCreateSessionId(),
      }),
    });
  } catch {
    /* non-blocking */
  }
}

type Props = {
  product: KhiterisEditProduct;
  editSlug: string;
  editMonth: string;
  clickTarget: "image" | "title";
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function KhiteriProductAffiliateLink({
  product,
  editSlug,
  editMonth,
  clickTarget,
  className,
  ariaLabel,
  children,
}: Props) {
  const handleClick = () => {
    trackAffiliateClick({
      productId: `khiteri:${product.id}`,
      brandName: product.brand,
      price: parsePrice(product.price),
      currency: "USD",
      source: "khiteri_edit",
      clickTarget,
      editSlug,
      editMonth,
    });
    void recordKhiteriClickout({ editSlug, editMonth, product, clickTarget });
  };

  return (
    <a
      href={product.href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

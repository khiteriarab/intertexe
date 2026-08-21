import type { Metadata } from "next";
import { SITE_URL } from "./seo-international";
import type { Product } from "./supabase-server";

/** Central crawl/indexation policy. Import this instead of scattering robots logic. */

export const SEO_BRAND = "INTERTEXE";

export const INDEX_FOLLOW: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const NOINDEX_FOLLOW: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

export const NOINDEX_NOFOLLOW: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

/** Query params that must never create an indexable URL. */
export const NON_INDEXABLE_QUERY_KEYS = [
  "sort",
  "q",
  "color",
  "fiber",
  "category",
  "fiberSubtype",
  "materialSubtype",
  "fabricConstruction",
  "price",
  "brands",
  "brand",
  "market",
  "page",
  "offset",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "ttclid",
  "msclkid",
  "u1",
] as const;

export type ProductIndexInput = {
  id?: string | null;
  name?: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  composition?: string | null;
  naturalFiberPercent?: number | null;
  stockStatus?: string | null;
};

const MIN_COMPOSITION_CHARS = 4;

export function hasMeaningfulComposition(composition?: string | null): boolean {
  const text = String(composition || "").trim();
  if (text.length < MIN_COMPOSITION_CHARS) return false;
  return /\d\s*%|[a-z]{3,}/i.test(text);
}

export function hasUsableImage(imageUrl?: string | null): boolean {
  const url = String(imageUrl || "").trim();
  return url.startsWith("https://") || url.startsWith("http://");
}

export function hasRetailerDestination(url?: string | null): boolean {
  const dest = String(url || "").trim();
  if (!dest.startsWith("http")) return false;
  try {
    const host = new URL(dest).hostname.replace(/^www\./, "");
    return host.length > 0 && host !== "intertexe.com";
  } catch {
    return false;
  }
}

/**
 * A product page may be indexed only when it can answer a shopper’s question
 * with verified INTERTEXE data. Missing fields → render the page, noindex it,
 * keep it out of XML sitemaps.
 */
export function isIndexableProduct(product: ProductIndexInput | Product | null | undefined): boolean {
  if (!product) return false;
  const name = String(product.name || "").trim();
  const brand = String(product.brandName || "").trim();
  if (!name || name.length < 2) return false;
  if (!brand || brand.length < 2) return false;
  if (!hasUsableImage(product.imageUrl)) return false;
  if (!hasRetailerDestination(product.url)) return false;
  if (!hasMeaningfulComposition(product.composition)) return false;
  const nfp = product.naturalFiberPercent;
  if (nfp != null && Number.isFinite(nfp) && nfp < 80) return false;
  return true;
}

export function searchParamsAreIndexable(params: Record<string, string | string[] | undefined> | null | undefined): boolean {
  if (!params) return true;
  for (const key of NON_INDEXABLE_QUERY_KEYS) {
    const value = params[key];
    if (value == null) continue;
    const text = Array.isArray(value) ? value.join("") : String(value);
    if (text.trim()) return false;
  }
  return true;
}

export function absoluteUrl(path = ""): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function productCanonicalPath(id: string): string {
  return `/product/${id}`;
}

export function productTitle(product: { name: string; brandName: string; composition?: string | null }): string {
  const name = product.name.trim();
  const brand = product.brandName.trim();
  return `${name} by ${brand}: Material, Composition & Price`;
}

export function productDescription(product: {
  name: string;
  brandName: string;
  composition?: string | null;
  naturalFiberPercent?: number | null;
  price?: string | null;
}): string {
  const parts = [`${product.name} by ${product.brandName}`];
  if (hasMeaningfulComposition(product.composition)) {
    parts.push(`Composition: ${String(product.composition).trim().slice(0, 120)}`);
  }
  if (product.naturalFiberPercent != null && Number.isFinite(product.naturalFiberPercent)) {
    parts.push(`${Math.round(product.naturalFiberPercent)}% natural fiber.`);
  }
  parts.push("Purchases are completed with the retailer. INTERTEXE is not the seller.");
  return parts.join(" ");
}

export function brandTitle(name: string): string {
  return `${name} Materials: Shop by Fabric & Composition`;
}

export type BreadcrumbItem = { name: string; path?: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const node: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };
      if (item.path) node.item = absoluteUrl(item.path);
      return node;
    }),
  };
}

export function productJsonLd(product: Product, opts: { availability: string; priceCurrency?: string }) {
  const pageUrl = absoluteUrl(productCanonicalPath(String(product.id)));
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: hasMeaningfulComposition(product.composition)
      ? `${product.name} by ${product.brandName}. Composition: ${product.composition}.`
      : `${product.name} by ${product.brandName}.`,
    brand: { "@type": "Brand", name: product.brandName },
    url: pageUrl,
  };
  if (product.imageUrl) data.image = product.imageUrl;
  if (hasMeaningfulComposition(product.composition)) data.material = product.composition;
  if (product.category) data.category = product.category;
  if (product.productId && String(product.productId) !== String(product.id)) {
    data.sku = String(product.productId);
  }

  const numericPrice = String(product.price || "").replace(/[^0-9.]/g, "");
  if (numericPrice && product.url) {
    data.offers = {
      "@type": "Offer",
      price: numericPrice,
      priceCurrency: opts.priceCurrency || "USD",
      availability: opts.availability,
      url: product.url,
      seller: {
        "@type": "Organization",
        name: "Retail partner",
      },
    };
  }

  return data;
}

export const AFFILIATE_PAGE_DISCLOSURE =
  "INTERTEXE is a fashion discovery and material-intelligence platform. Purchases are completed with the retailer. INTERTEXE is not the merchant of record and does not set shipping or return policies.";

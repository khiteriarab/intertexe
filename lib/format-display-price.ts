/**
 * Single source of truth for showing product prices in the UI.
 * Never render raw DB numeric strings (e.g. "1260") — format with market-appropriate currency.
 */

import { SHOP_MARKET_STORAGE_KEY } from "./shipping-regions";

export type DisplayPriceProduct = {
  price?: string | number | null | undefined;
  originalPrice?: string | number | null | undefined;
  /** live_products_apparel.region or catalog row */
  listingRegion?: string | null;
  productId?: string | null;
};

type PriceRegion = "us" | "uk" | "eu";

function regionFromShoppingMarket(): PriceRegion | null {
  if (typeof window === "undefined") return null;
  try {
    const market = localStorage.getItem(SHOP_MARKET_STORAGE_KEY);
    if (market === "eu-uk-me") return "uk";
    if (market === "us-ca") return "us";
  } catch {
    /* ignore */
  }
  return null;
}

function regionFromHints(product?: DisplayPriceProduct | null): PriceRegion {
  const marketRegion = regionFromShoppingMarket();
  if (marketRegion) return marketRegion;
  if (!product) return "us";
  const raw = String(product.listingRegion || "").trim().toLowerCase();
  if (!raw) return "us";
  if (/^(uk|gb|great britain|united kingdom)\b/i.test(raw) || raw.includes("uk")) return "uk";
  if (/^(eu|eur|de|fr|es|it|nl|eu-uk-me)\b/i.test(raw) || raw.includes("eu")) return "eu";
  return "us";
}

function normalizeInput(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const s = String(raw);
    return s.trim();
  }
  return String(raw).trim();
}

function looksPrefixedCurrency(s: string): boolean {
  const t = s.trim();
  if (/^[\s]*[\$£€\u00A3\u20AC]/.test(t)) return true;
  return /\b(USD|EUR|GBP)\b/i.test(t);
}

/** True when the UI should synthesize symbols (digits only / plain decimal). */
function isBareNumericPrice(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (looksPrefixedCurrency(t)) return false;
  const noComma = t.replace(/,/g, "");
  const n = parseFloat(noComma.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return false;
  if (/[^\d\s.,]/.test(t)) return false;
  return true;
}

function formatNumberForRegion(n: number, region: PriceRegion): string {
  if (region === "uk") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  if (region === "eu") {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Format a listing price column; prefers preserving existing formatted strings when symbols are present. */
export function formatListingPrice(raw: string | number | null | undefined, hints?: DisplayPriceProduct | null): string {
  const s = normalizeInput(raw);
  if (!s) return "";
  const region = regionFromHints(hints);

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return formatNumberForRegion(raw, region);
  }

  if (looksPrefixedCurrency(s)) {
    const n = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n)) return s.trim();
    if (/\u00A3|£/.test(s)) return formatNumberForRegion(n, "uk");
    if (/\u20AC|€/.test(s)) return formatNumberForRegion(n, "eu");
    if (/\$/i.test(s) || /\bUSD\b/i.test(s)) return formatNumberForRegion(n, "us");
    if (/\bGBP\b/i.test(s)) return formatNumberForRegion(n, "uk");
    if (/\bEUR\b/i.test(s)) return formatNumberForRegion(n, "eu");
    return s.trim();
  }

  if (isBareNumericPrice(s)) {
    const n = parseFloat(s.replace(/,/g, "").replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n)) return s.trim();
    return formatNumberForRegion(n, region);
  }

  return s.trim();
}

export function formatDisplayPrice(product?: DisplayPriceProduct | null): string {
  if (!product) return "";
  return formatListingPrice(product.price, product);
}

export function formatDisplayOriginalPrice(product?: DisplayPriceProduct | null): string {
  if (!product) return "";
  const o = product.originalPrice;
  return formatListingPrice(o, product);
}

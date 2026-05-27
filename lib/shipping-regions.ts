/** Shopping destinations — text only (no flag emojis). Shared by navbar and shop. */
export type MarketFilter = "all" | "us-ca" | "eu-uk-me";

export type ShippingRegion = {
  country: string;
  code?: string;
  currency: string;
  market: MarketFilter;
  featured?: boolean;
};

export const SHIPPING_REGIONS: ShippingRegion[] = [
  { country: "United States", code: "US", currency: "USD", market: "us-ca", featured: true },
  { country: "Canada", code: "CA", currency: "USD", market: "us-ca", featured: true },
  { country: "United Kingdom", code: "GB", currency: "GBP", market: "eu-uk-me", featured: true },
  { country: "Spain", code: "ES", currency: "EUR", market: "eu-uk-me", featured: true },
  { country: "France", code: "FR", currency: "EUR", market: "eu-uk-me" },
  { country: "Italy", code: "IT", currency: "EUR", market: "eu-uk-me" },
  { country: "Germany", code: "DE", currency: "EUR", market: "eu-uk-me" },
  { country: "Netherlands", code: "NL", currency: "EUR", market: "eu-uk-me" },
  { country: "Ireland", code: "IE", currency: "EUR", market: "eu-uk-me" },
  { country: "Portugal", code: "PT", currency: "EUR", market: "eu-uk-me" },
  { country: "United Arab Emirates", code: "AE", currency: "GBP", market: "eu-uk-me" },
  { country: "Saudi Arabia", code: "SA", currency: "GBP", market: "eu-uk-me" },
  { country: "Kuwait", code: "KW", currency: "GBP", market: "eu-uk-me" },
  { country: "Qatar", code: "QA", currency: "GBP", market: "eu-uk-me" },
  { country: "All destinations", currency: "ALL", market: "all" },
];

export const SHOP_MARKET_STORAGE_KEY = "intertexe_shop_market";
export const SHOP_MARKET_EVENT = "intertexe-shop-market-change";
export const SHOP_CATALOG_REGION_KEY = "intertexe_catalog_region";

export function normalizeCatalogRegion(raw: string | null | undefined): string | undefined {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "ca" || value === "canada") return "ca";
  if (value === "us" || value === "usa") return "us";
  if (value === "uk" || value === "gb") return "uk";
  if (value === "eu") return "eu";
  return undefined;
}

export function catalogRegionForCountryCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  if (upper === "CA") return "ca";
  if (upper === "US") return "us";
  if (upper === "GB" || upper === "UK") return "uk";
  const euCountries = new Set([
    "DE", "FR", "IT", "ES", "NL", "BE", "PT", "AT", "SE", "NO", "DK", "FI", "PL", "CH", "IE", "GR", "EU",
  ]);
  if (euCountries.has(upper)) return "eu";
  return undefined;
}

export function marketFromSearchParam(raw: string | null): MarketFilter {
  if (raw === "us-ca" || raw === "eu-uk-me") return raw;
  return "all";
}

export function getRegionForMarket(market: MarketFilter): ShippingRegion {
  return (
    SHIPPING_REGIONS.find((r) => r.market === market && r.featured) ||
    SHIPPING_REGIONS.find((r) => r.market === market) ||
    SHIPPING_REGIONS[SHIPPING_REGIONS.length - 1]
  );
}

export function getRegionForCountryCode(code: string | undefined): ShippingRegion | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return SHIPPING_REGIONS.find((r) => r.code === upper);
}

export const SHOP_CATALOG_REGION_EVENT = "intertexe-catalog-region-change";

export function readStoredCatalogRegion(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return normalizeCatalogRegion(window.localStorage.getItem(SHOP_CATALOG_REGION_KEY));
  } catch {
    return undefined;
  }
}

export function writeStoredCatalogRegion(region: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeCatalogRegion(region);
    if (normalized) window.localStorage.setItem(SHOP_CATALOG_REGION_KEY, normalized);
    else window.localStorage.removeItem(SHOP_CATALOG_REGION_KEY);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(SHOP_CATALOG_REGION_EVENT, { detail: normalizeCatalogRegion(region) })
  );
}

export function formatRegionLabel(region: ShippingRegion, compact = false): string {
  const cur = region.currency === "ALL" ? "" : region.currency;
  if (compact) {
    return cur ? `${region.country} · ${cur}` : region.country;
  }
  return cur ? `${region.country} (${cur})` : region.country;
}

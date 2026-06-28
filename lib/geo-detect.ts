import { catalogRegionForCountryCode } from "./shipping-regions";

/** ISO country from Vercel / Cloudflare edge headers (no third-party IP API). */
export function getCountryFromHeaders(headerList: Headers): string | undefined {
  const raw =
    headerList.get("x-vercel-ip-country") ||
    headerList.get("cf-ipcountry") ||
    headerList.get("x-country-code") ||
    headerList.get("x-geo-country");
  const code = raw?.trim().toUpperCase();
  return code && code !== "XX" ? code : undefined;
}

/** Map country code → catalog region slug used in `products.region`. */
export function catalogRegionFromCountry(countryCode: string | undefined): string {
  return catalogRegionForCountryCode(countryCode) ?? "us";
}

/** Preferred region first, then sensible fallbacks for affiliate URL lookup. */
export function catalogRegionFallbackChain(catalogRegion: string): string[] {
  switch (catalogRegion) {
    case "ca":
      return ["ca", "us"];
    case "uk":
      return ["uk", "eu", "us"];
    case "eu":
      return ["eu", "uk", "us"];
    case "us":
    default:
      return ["us", "eu", "uk"];
  }
}

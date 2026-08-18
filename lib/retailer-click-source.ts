/** First-party retailer click sources shared by web, extension, and iOS. */
export const RETAILER_CLICK_SOURCES = [
  "chrome_extension",
  "website",
  "shop",
  "ios_product_detail",
  "scan_history",
  "account_clickout",
  "saved_inspiration",
  "scanner",
] as const;

export type RetailerClickSource = (typeof RETAILER_CLICK_SOURCES)[number];

export function normalizeRetailerClickSource(
  raw: unknown,
  fallback: RetailerClickSource = "website"
): RetailerClickSource {
  const s = String(raw || "").trim();
  if (s === "chrome_extension" || s === "safari_extension") return "chrome_extension";
  if (s === "ios_app" || s === "ios_share_extension" || s === "ios_product_detail") {
    return "ios_product_detail";
  }
  if (s === "saved_inspiration") return "saved_inspiration";
  if (s === "account_clickout") return "account_clickout";
  if (s === "scan_history") return "scan_history";
  if (s === "scanner") return "scanner";
  if (s === "shop" || s === "website" || s === "web") return s === "shop" ? "shop" : "website";
  return fallback;
}

/** JWT identity wins. Never trust a client-supplied user id. */
export function resolveAuthenticatedUserId(
  jwtUserId: string | null | undefined,
  bodyUserId?: unknown
): string | null {
  const jwt = String(jwtUserId || "").trim();
  if (jwt) return jwt;
  void bodyUserId;
  return null;
}

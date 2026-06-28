declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Legacy scanner hooks (brand + mode + matched). */
export function trackScanStart(mode: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "scan_start", { scan_mode: mode });
}

export function trackScanComplete(
  brandOrParams: string | {
    naturalPercent: number;
    verdict: string;
    hasAlternatives: boolean;
    source: "barcode" | "composition" | "url";
  },
  mode?: string,
  matched?: boolean
) {
  if (typeof window === "undefined") return;
  if (typeof brandOrParams === "object") {
    window.gtag?.("event", "scan_complete", {
      natural_fiber_percent: brandOrParams.naturalPercent,
      verdict: brandOrParams.verdict,
      has_alternatives: brandOrParams.hasAlternatives,
      scan_source: brandOrParams.source,
    });
    return;
  }
  window.gtag?.("event", "scan_complete", {
    brand_name: brandOrParams,
    scan_mode: mode,
    matched: Boolean(matched),
  });
}

export function trackScanError(mode: string, message: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "scan_error", { scan_mode: mode, error_message: message });
}

export function trackAffiliateClick(params: {
  productId: string;
  brandName: string;
  price: number;
  currency: string;
  source: "scanner" | "shop" | "collection" | "sale" | "khiteri_edit";
  clickTarget?: "image" | "title";
  editSlug?: string;
  editMonth?: string;
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "affiliate_click", {
    product_id: params.productId,
    brand_name: params.brandName,
    value: params.price,
    currency: params.currency,
    source: params.source,
    click_target: params.clickTarget,
    edit_slug: params.editSlug,
    edit_month: params.editMonth,
  });
}

/** Leaving-page redirect (brand + destination URL). */
export function trackAffiliateRedirect(brand: string, url: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "affiliate_redirect", {
    brand_name: brand,
    link_url: url,
  });
}

export function trackQuizStart() {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "quiz_start", {});
}

export function trackQuizComplete(params: {
  persona: string;
  preferredFibers: string[];
  spendRange: string;
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "quiz_complete", {
    persona: params.persona,
    preferred_fibers: params.preferredFibers.join(","),
    spend_range: params.spendRange,
  });
}

export function trackAccountCreated(params: {
  source: "scanner" | "quiz" | "wishlist" | "direct";
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "sign_up", {
    method: "email",
    source: params.source,
  });
}

export function trackSearch(params: { searchTerm: string; resultCount: number }) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "search", {
    search_term: params.searchTerm,
    result_count: params.resultCount,
  });
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const GA_MEASUREMENT_ID = "G-EVKFJLK9BP";

/** Parse GA4 client_id from the _ga cookie. */
export function getGaClientId(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (!m?.[1]) return null;
    const raw = decodeURIComponent(m[1]);
    const parts = raw.split(".");
    if (parts.length >= 4) return `${parts[2]}.${parts[3]}`;
    return raw;
  } catch {
    return null;
  }
}

/**
 * Associate authenticated Supabase user with GA4 (user_id).
 * Never send email/name — only the internal UUID.
 */
export function setGaUserId(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  const id = String(userId).trim();
  if (!id) return;
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    user_id: id,
    send_page_view: false,
  });
  window.gtag?.("set", { user_id: id });
}

/** Legacy scanner hooks (brand + mode + matched). */
export function trackScanStart(mode: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "scan_start", { scan_mode: mode });
  void import("./meta-pixel").then((m) => m.metaTrackScanStarted(mode)).catch(() => null);
}

export function trackScanComplete(
  brandOrParams:
    | string
    | {
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
    void import("./meta-pixel")
      .then((m) =>
        m.metaTrackScanCompleted({
          mode: brandOrParams.source,
          matched: brandOrParams.hasAlternatives,
          naturalPercent: brandOrParams.naturalPercent,
        })
      )
      .catch(() => null);
    if (brandOrParams.hasAlternatives) {
      void import("./meta-pixel").then((m) => m.metaTrackTxMatchUsed({ matched: true })).catch(() => null);
    }
    return;
  }
  window.gtag?.("event", "scan_complete", {
    brand_name: brandOrParams,
    scan_mode: mode,
    matched: Boolean(matched),
  });
  void import("./meta-pixel")
    .then((m) => m.metaTrackScanCompleted({ mode, matched: Boolean(matched) }))
    .catch(() => null);
  if (matched) {
    void import("./meta-pixel").then((m) => m.metaTrackTxMatchUsed({ matched: true })).catch(() => null);
  }
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
  // Never fire Meta Purchase for affiliate clickouts.
  void import("./meta-pixel")
    .then((m) =>
      m.metaTrackRetailerClick({
        productId: params.productId,
        brandName: params.brandName,
        value: params.price,
        currency: params.currency,
        source: params.source,
      })
    )
    .catch(() => null);
}

export function trackEditorialPageView(params: { editSlug: string; editMonth: string }) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "editorial_page_view", {
    edit_slug: params.editSlug,
    edit_month: params.editMonth,
    page_path: `/${params.editSlug}`,
  });
  void import("./meta-pixel")
    .then((m) =>
      m.metaTrackViewContent({
        contentIds: [params.editSlug],
        contentName: params.editSlug,
        contentType: "product_group",
      })
    )
    .catch(() => null);
}

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
  userId?: string;
}) {
  if (typeof window === "undefined") return;
  if (params.userId) setGaUserId(params.userId);
  window.gtag?.("event", "sign_up", {
    method: "email",
    source: params.source,
  });
  void import("./meta-pixel")
    .then((m) => m.metaTrackCompleteRegistration({ method: "email", status: true }))
    .catch(() => null);
}

export function trackSearch(params: { searchTerm: string; resultCount: number }) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "search", {
    search_term: params.searchTerm,
    result_count: params.resultCount,
  });
  void import("./meta-pixel")
    .then((m) =>
      m.metaTrackSearch({ searchString: params.searchTerm, resultCount: params.resultCount })
    )
    .catch(() => null);
}

export function trackProductFavorite(params: {
  productId: string;
  contentName?: string;
  value?: number | null;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "add_to_wishlist", {
    product_id: params.productId,
    value: params.value ?? undefined,
    currency: params.currency || "USD",
  });
  void import("./meta-pixel")
    .then((m) =>
      m.metaTrackAddToWishlist({
        contentIds: [params.productId],
        contentName: params.contentName,
        value: params.value,
        currency: params.currency,
      })
    )
    .catch(() => null);
}

export function trackViewContent(params: {
  productId: string;
  contentName?: string;
  value?: number | null;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "view_item", {
    item_id: params.productId,
    item_name: params.contentName,
    value: params.value ?? undefined,
    currency: params.currency || "USD",
  });
  void import("./meta-pixel")
    .then((m) =>
      m.metaTrackViewContent({
        contentIds: [params.productId],
        contentName: params.contentName,
        value: params.value,
        currency: params.currency,
      })
    )
    .catch(() => null);
}

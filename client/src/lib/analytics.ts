declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  gtag("event", eventName, params);
}

export function trackPageView(path: string, title?: string) {
  gtag("event", "page_view", {
    page_path: path,
    page_title: title,
  });
}

export function trackSignup(method: string = "email") {
  trackEvent("sign_up", { method });
}

export function trackLogin(method: string = "email") {
  trackEvent("login", { method });
}

export function trackProductFavorite(productId: string, brandName: string, action: "add" | "remove") {
  trackEvent(action === "add" ? "add_to_wishlist" : "remove_from_wishlist", {
    item_id: productId,
    item_brand: brandName,
  });
}

export function trackShopClick(productId: string, brandName: string, productName: string, url: string) {
  trackEvent("select_item", {
    item_id: productId,
    item_brand: brandName,
    item_name: productName,
    outbound_url: url,
  });
}

export function trackAffiliateRedirect(brandName: string, url: string) {
  trackEvent("affiliate_redirect", {
    brand: brandName,
    outbound_url: url,
  });
}

export function trackBrandView(brandSlug: string, brandName: string) {
  trackEvent("view_brand", {
    brand_slug: brandSlug,
    brand_name: brandName,
  });
}

export function trackMaterialFilter(fiber: string, category?: string) {
  trackEvent("filter_products", {
    fiber_type: fiber,
    category: category || "all",
  });
}

export function trackQuizComplete(persona: string) {
  trackEvent("quiz_complete", {
    fabric_persona: persona,
  });
}

export function trackQuizStart() {
  trackEvent("quiz_start");
}

export function trackSearch(query: string, resultCount: number) {
  trackEvent("search", {
    search_term: query,
    results_count: resultCount,
  });
}

export function trackChatMessage() {
  trackEvent("chat_message");
}

export function trackEmailCapture(source: string) {
  trackEvent("email_capture", {
    source,
  });
}

export function trackScanStart(mode: "camera" | "upload" | "url") {
  trackEvent("scan_start", { scan_mode: mode });
}

export function trackScanComplete(brandName: string, mode: "camera" | "upload" | "url", matched: boolean) {
  trackEvent("scan_complete", {
    brand_name: brandName,
    scan_mode: mode,
    matched_in_directory: matched,
  });
}

export function trackScanError(mode: "camera" | "upload" | "url", error: string) {
  trackEvent("scan_error", { scan_mode: mode, error_message: error });
}

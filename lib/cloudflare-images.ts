const CF_IMAGE_PROXY_BASE = "https://intertexe.com";

function shouldBypassCloudflareImageProxy(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    // Shopify CDN assets can reject Cloudflare image re-fetching (403 cf-resized err=9408).
    return (
      host === "cdn.shopify.com" ||
      host.endsWith(".cdn.shopify.com") ||
      host.endsWith(".myshopify.com") ||
      host.endsWith(".shopifycdn.net") ||
      host.endsWith(".shopifyusercontent.com")
    );
  } catch {
    return false;
  }
}

export function cfImage(
  url: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "auto" | "webp" | "avif";
    fit?: "cover" | "contain" | "scale-down";
  } = {}
): string {
  if (!url) return "";

  if (url.includes("cdn-cgi/image")) return url;
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  if (shouldBypassCloudflareImageProxy(url)) return url;

  const {
    width = 800,
    height,
    quality = 85,
    format = "auto",
    fit = "cover",
  } = options;

  const params = [
    width ? `width=${width}` : "",
    height ? `height=${height}` : "",
    quality ? `quality=${quality}` : "",
    format ? `format=${format}` : "",
    fit ? `fit=${fit}` : "",
  ]
    .filter(Boolean)
    .join(",");

  // Encode the source URL segment so query strings (e.g. `...?v=...&width=...`)
  // don't get interpreted as this proxy's query string and break resizing.
  return `${CF_IMAGE_PROXY_BASE}/cdn-cgi/image/${params}/${encodeURIComponent(url)}`;
}

export const cfProductCard = (url: string | null | undefined) =>
  cfImage(url, { width: 400, quality: 80 });

export const cfProductDetail = (url: string | null | undefined) =>
  cfImage(url, { width: 800, quality: 90 });

export const cfHomepageRail = (url: string | null | undefined) =>
  cfImage(url, { width: 300, quality: 75 });

export const cfScanResult = (url: string | null | undefined) =>
  cfImage(url, { width: 600, quality: 85 });

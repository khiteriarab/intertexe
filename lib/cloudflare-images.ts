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

  return `https://intertexe.com/cdn-cgi/image/${params}/${url}`;
}

export const cfProductCard = (url: string | null | undefined) =>
  cfImage(url, { width: 400, quality: 80 });

export const cfProductDetail = (url: string | null | undefined) =>
  cfImage(url, { width: 800, quality: 90 });

export const cfHomepageRail = (url: string | null | undefined) =>
  cfImage(url, { width: 300, quality: 75 });

export const cfScanResult = (url: string | null | undefined) =>
  cfImage(url, { width: 600, quality: 85 });

export const CAPTURE_WATCH_PREFIX = "capture:";

export function captureWatchId(captureId: string): string {
  return `${CAPTURE_WATCH_PREFIX}${String(captureId || "").trim()}`;
}

export function parseCaptureWatchId(productId: string): string | null {
  const value = String(productId || "");
  if (!value.startsWith(CAPTURE_WATCH_PREFIX)) return null;
  const id = value.slice(CAPTURE_WATCH_PREFIX.length).trim();
  return id || null;
}

export function savedPriceText(price: unknown, currency?: string | null): string | null {
  if (price == null || price === "") return null;
  const n = typeof price === "number" ? price : parseFloat(String(price).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const code = String(currency || "").trim().toUpperCase();
  return code ? `${n} ${code}` : String(n);
}

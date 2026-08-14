export const APP_DOWNLOAD_CLICK_EVENT = "app_download_click";

export type AppDownloadClickChannel = "website" | "meta" | "tiktok" | "email" | "qr" | "other";

export function classifyAppDownloadChannel(input: {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  cta_location?: string | null;
}): AppDownloadClickChannel {
  const src = String(input.utm_source || "").toLowerCase();
  const med = String(input.utm_medium || "").toLowerCase();
  const cta = String(input.cta_location || "").toLowerCase();
  if (input.ttclid || /tiktok/.test(src) || /tiktok/.test(cta)) return "tiktok";
  if (input.fbclid || /facebook|meta|instagram|\bfb\b|\big\b/.test(src) || /meta|facebook/.test(cta)) {
    return "meta";
  }
  if (/email|loops|resend|newsletter/.test(src) || med === "email" || cta.startsWith("email_")) return "email";
  if (/qr|sticker|packaging/.test(src) || /qr|sticker/.test(med) || /qr|sticker/.test(cta)) return "qr";
  if (!src || src === "direct" || src === "website" || src === "intertexe") return "website";
  return "other";
}

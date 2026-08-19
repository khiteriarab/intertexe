/**
 * Desktop Chrome should not sit on /open waiting for the iOS app.
 * Capture links go straight to the saved piece + TX Matches page.
 */

export type OpenLandingInput = {
  userAgent?: string | null;
  next?: string | null;
  cta?: string | null;
};

export function webPathFromOpenNext(next?: string | null): string {
  const raw = String(next || "/").trim() || "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const inspiration = path.match(/^\/inspirations\/([^/?#]+)/);
  if (inspiration) return `/matches/${inspiration[1]}`;
  const capture = path.match(/^\/capture\/([^/?#]+)/);
  if (capture) return `/matches/${capture[1]}`;
  return path;
}

export function isMobileAppUserAgent(userAgent?: string | null): boolean {
  return /iPhone|iPad|iPod|Android/i.test(String(userAgent || ""));
}

export function shouldSkipAppOpenLanding(input: OpenLandingInput): boolean {
  if (isMobileAppUserAgent(input.userAgent)) return false;
  const path = webPathFromOpenNext(input.next);
  const cta = String(input.cta || "");
  return cta === "chrome_extension_open" || path.startsWith("/capture/") || path.startsWith("/matches/");
}

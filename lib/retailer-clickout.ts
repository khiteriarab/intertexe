/**
 * Retailer click-out helpers.
 *
 * Problem: iOS Universal Links hand MyTheresa.com URLs to the MyTheresa app.
 * Paths polluted with feed_num / affiliate query junk often fail in-app routing
 * and dump the user on home / last-browsed brand PLP instead of the PDP.
 *
 * Fix: keep Rakuten attribution, but open a cleaned product path (and prefer
 * /deeplink?mid=&murl= over brittle offerid links).
 */

const RAKUTEN_SID = "*8b0zWDyXo0";

const TRACKING_QUERY_KEYS = new Set([
  "feed_num",
  "feed_des",
  "feed_mwg",
  "dplink",
  "chn",
  "src",
  "cmp",
  "tarea",
  "pub_id",
  "pub_name",
  "pub_type",
  "ptyp",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "pid",
  "ranmid",
  "raneaid",
  "ransiteid",
  "partnerid",
  "cm_mmc",
]);

export function isRakutenClickUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("linksynergy.com") || host.includes("rakuten");
  } catch {
    return false;
  }
}

/** Destination merchant URL inside a Rakuten click/deeplink, else the URL itself. */
export function extractAffiliateDestination(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const murl = parsed.searchParams.get("murl");
    if (murl) {
      try {
        return decodeURIComponent(murl);
      } catch {
        return murl;
      }
    }
    if (!isRakutenClickUrl(url)) return url;
    return null;
  } catch {
    return null;
  }
}

/** Known Rakuten MIDs — longest-first so offerid prefixes match correctly. */
const KNOWN_RAKUTEN_MIDS = [
  "52963",
  "52708",
  "50745",
  "50739",
  "49987",
  "49384",
  "46961",
  "43654",
  "43172",
  "42841",
  "42623",
  "41993",
  "39906",
  "37206",
  "36145",
  "35663",
  "13867",
].sort((a, b) => b.length - a.length);

export function extractRakutenMid(url: string): string | null {
  try {
    const parsed = new URL(url);
    const mid = parsed.searchParams.get("mid");
    if (mid && /^\d+$/.test(mid)) return mid;
    const offerid = parsed.searchParams.get("offerid") || "";
    // offerid shape: {program}.{mid}{sku…} e.g. 2033543.4317214617…
    const afterDot = offerid.split(".")[1] || "";
    for (const known of KNOWN_RAKUTEN_MIDS) {
      if (afterDot.startsWith(known)) return known;
    }
    const dest = extractAffiliateDestination(url);
    if (dest) {
      const d = new URL(dest);
      const ran = d.searchParams.get("ranMID") || d.searchParams.get("ranmid");
      if (ran && /^\d+$/.test(ran)) return ran;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Strip affiliate/feed tracking query noise so retailer apps can deep-link the PDP.
 * Keeps non-tracking params (size, color, variant ids, etc.).
 */
export function cleanRetailerDestinationUrl(destUrl: string): string {
  try {
    const u = new URL(destUrl);
    const host = u.hostname.toLowerCase();
    const isMytheresa = host.includes("mytheresa.com");
    const isBloomies = host.includes("bloomingdales.");
    if (!isMytheresa && !isBloomies) {
      // Still drop obvious tracker keys everywhere.
    }
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    // MyTheresa PDPs are path-identified (…-p01128200); drop empty search entirely.
    if (isMytheresa && ![...u.searchParams.keys()].length) {
      u.search = "";
    }
    u.hash = "";
    return u.toString();
  } catch {
    return destUrl;
  }
}

/** Rebuild as Rakuten deeplink with cleaned destination (stable PDP deep link). */
export function toRakutenDeeplink(url: string, midHint?: string | null): string {
  if (!url) return url;
  try {
    if (!isRakutenClickUrl(url) && !String(url).includes("mytheresa.com")) {
      return url;
    }
    const destRaw = extractAffiliateDestination(url) || (isRakutenClickUrl(url) ? null : url);
    if (!destRaw) return url;
    const cleaned = cleanRetailerDestinationUrl(destRaw);
    const mid = midHint || extractRakutenMid(url);
    if (!mid) {
      // Keep original tracking URL but with cleaned murl if present.
      if (isRakutenClickUrl(url)) {
        const parsed = new URL(url);
        if (parsed.searchParams.has("murl")) {
          parsed.searchParams.set("murl", cleaned);
          return parsed.toString();
        }
      }
      return url;
    }
    const sid =
      (() => {
        try {
          return new URL(url).searchParams.get("id") || RAKUTEN_SID;
        } catch {
          return RAKUTEN_SID;
        }
      })();
    return `https://click.linksynergy.com/deeplink?id=${encodeURIComponent(sid)}&mid=${encodeURIComponent(mid)}&murl=${encodeURIComponent(cleaned)}`;
  } catch {
    return url;
  }
}

/**
 * URL the user/agent should open:
 * - Affiliate-wrapped when we have a Rakuten link (attribution)
 * - Destination cleaned so MyTheresa/Bloomingdale's apps can route to the PDP
 */
export function improveRetailerClickoutUrl(
  url: string,
  opts?: { retailerMid?: string | null }
): string {
  if (!url) return url;
  return toRakutenDeeplink(url, opts?.retailerMid);
}

/** Clean merchant PDP for post-attribution redirects (no linksynergy host). */
export function retailerOpenDestinationUrl(url: string): string | null {
  const dest = extractAffiliateDestination(url) || (!isRakutenClickUrl(url) ? url : null);
  if (!dest) return null;
  return cleanRetailerDestinationUrl(dest);
}

/** Absolute INTERTEXE hop that attributes then lands on the cleaned PDP. */
export function intertexeClickoutHopPath(affiliateUrl: string, origin?: string): string {
  const q = new URLSearchParams({ url: affiliateUrl });
  const path = `/api/go?${q.toString()}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

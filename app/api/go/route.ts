import { NextRequest, NextResponse } from "next/server";
import {
  improveRetailerClickoutUrl,
  isRakutenClickUrl,
  retailerOpenDestinationUrl,
} from "../../../lib/retailer-clickout";
import { appendU1 } from "../../../lib/affiliate-url";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function isAllowedOutbound(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    // Block obvious open-redirect abuse back into our own go endpoint loops.
    if (host.includes("intertexe.com") && u.pathname.startsWith("/api/go")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Click-out hop for Shop Now (web + iOS).
 *
 * 1. Fire the Rakuten tracking URL server-side (attribution).
 * 2. 302 to the cleaned merchant PDP so Universal Links / retailer apps
 *    receive a path they can route — not a feed_num-polluted URL that dumps
 *    users on MyTheresa home / last brand PLP.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") || "";
  const u1 = request.nextUrl.searchParams.get("u1") || "";
  if (!raw || !isAllowedOutbound(raw)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const tracked = appendU1(improveRetailerClickoutUrl(raw), u1 || null);
  const openDest = retailerOpenDestinationUrl(tracked) || tracked;

  if (!isAllowedOutbound(openDest)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // Attribution ping (short budget) before handing the user a clean PDP URL.
  if (isRakutenClickUrl(tracked) && tracked !== openDest) {
    try {
      await Promise.race([
        fetch(tracked, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": request.headers.get("user-agent") || "INTERTEXE-Clickout/1.0",
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch {
      // Still send the shopper to the product even if tracking is slow/down.
    }
  }

  return NextResponse.redirect(openDest, 302);
}

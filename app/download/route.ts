import { NextRequest, NextResponse } from "next/server";
import { APP_DOWNLOAD_CLICK_EVENT, classifyAppDownloadChannel } from "../../lib/app-download-channel";
import { extractFirstTouchFromRequest } from "../../lib/dashboard/attribution";
import { emitHqCustomerEvent } from "../../lib/dashboard/events";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";
import { getServerSupabase } from "../../lib/supabase-service-client";
import { SESSION_COOKIE } from "../../lib/session";

function newSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Legacy /download bookmarks → App Store. Logs first-party click, then 302. */
export async function GET(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  const sessionId = existing || newSessionId();
  const ft = extractFirstTouchFromRequest(request);
  const channel = classifyAppDownloadChannel({
    utm_source: ft.utm_source,
    utm_medium: ft.utm_medium,
    utm_campaign: ft.utm_campaign,
    fbclid: ft.fbclid,
    ttclid: ft.ttclid,
    cta_location: "download_redirect",
  });

  const supabase = getServerSupabase();
  let deduped = false;
  if (supabase) {
    const since = new Date(Date.now() - 120 * 1000).toISOString();
    const { data: existingEvent } = await supabase
      .from("hq_customer_events")
      .select("id")
      .eq("event_name", APP_DOWNLOAD_CLICK_EVENT)
      .eq("session_id", sessionId)
      .gte("event_timestamp", since)
      .limit(1)
      .maybeSingle();
    deduped = Boolean(existingEvent?.id);
  }

  if (!deduped) {
    // Fire-and-forget so the 302 is not delayed by the ledger write.
    void emitHqCustomerEvent({
      eventName: APP_DOWNLOAD_CLICK_EVENT,
      eventCategory: "acquisition",
      source: "web",
      sessionId,
      metadata: {
        source_page: request.headers.get("referer") || "/download",
        landing_path: "/download",
        cta_location: "download_redirect",
        destination: "app_store",
        utm_source: ft.utm_source || null,
        utm_medium: ft.utm_medium || null,
        utm_campaign: ft.utm_campaign || null,
        utm_content: ft.utm_content || null,
        fbclid: ft.fbclid || null,
        ttclid: ft.ttclid || null,
        channel,
        session_id: sessionId,
      },
    }).catch(() => null);
  }

  const res = NextResponse.redirect(getAppStoreUrl() || DEFAULT_APP_STORE_URL, 302);
  if (!existing) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      sameSite: "lax",
    });
  }
  return res;
}

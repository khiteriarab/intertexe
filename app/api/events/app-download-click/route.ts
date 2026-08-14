export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  APP_DOWNLOAD_CLICK_EVENT,
  classifyAppDownloadChannel,
} from "../../../../lib/app-download-channel";
import { extractFirstTouchFromRequest } from "../../../../lib/dashboard/attribution";
import { emitHqCustomerEvent } from "../../../../lib/dashboard/events";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

const DEDUPE_SECONDS = 120;

function clean(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

/**
 * Public first-party ingest for App Store / /open CTAs.
 * Writes hq_customer_events. Dedupes the same browser session for 2 minutes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const sessionId =
      clean(body.sessionId, 120) ||
      clean(request.headers.get("x-session-id"), 120) ||
      clean(request.cookies.get("intertexe_session_id")?.value, 120);
    if (!sessionId) {
      return NextResponse.json({ ok: false, reason: "session_required" }, { status: 400 });
    }

    const supabase = getServerSupabase();
    if (supabase) {
      const since = new Date(Date.now() - DEDUPE_SECONDS * 1000).toISOString();
      const { data: existing } = await supabase
        .from("hq_customer_events")
        .select("id")
        .eq("event_name", APP_DOWNLOAD_CLICK_EVENT)
        .eq("session_id", sessionId)
        .gte("event_timestamp", since)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    const bearer = request.headers.get("authorization");
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
    const userId = token ? await getSupabaseAuthUserId(token) : null;

    const ft = extractFirstTouchFromRequest(request, body);
    // Prefer this click's payload / landing query over older first-touch cookies.
    const utm_source = clean(body.utm_source) || ft.utm_source;
    const utm_medium = clean(body.utm_medium) || ft.utm_medium;
    const utm_campaign = clean(body.utm_campaign) || ft.utm_campaign;
    const utm_content = clean(body.utm_content) || ft.utm_content;
    const utm_term = clean(body.utm_term) || ft.utm_term;
    const fbclid = clean(body.fbclid) || ft.fbclid;
    const ttclid = clean(body.ttclid) || ft.ttclid;
    const gclid = clean(body.gclid) || ft.gclid;
    const ctaLocation = clean(body.ctaLocation ?? body.cta_location, 80) || "open_landing";
    const channel = classifyAppDownloadChannel({
      utm_source,
      utm_medium,
      utm_campaign,
      fbclid,
      ttclid,
      cta_location: ctaLocation,
    });

    const result = await emitHqCustomerEvent({
      customerId: userId,
      eventName: APP_DOWNLOAD_CLICK_EVENT,
      eventCategory: "acquisition",
      source: "web",
      sessionId,
      metadata: {
        source_page: clean(body.sourcePage ?? body.source_page, 500) || null,
        landing_path: clean(body.landingPath ?? body.landing_page, 500) || null,
        cta_location: ctaLocation,
        destination: clean(body.destination, 40) || "open",
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        fbclid: fbclid || null,
        ttclid: ttclid || null,
        gclid: gclid || null,
        channel,
        session_id: sessionId,
        user_id: userId || null,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[events/app-download-click]", err);
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}

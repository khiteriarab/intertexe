export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import {
  captureApiErrorMessage,
  getCaptureServiceClient,
} from "../../../../lib/capture-api-client";

const ALLOWED = new Set([
  "alternatives_viewed",
  "original_source_clicked",
  "alternative_clicked",
  "saved_to_collection",
  "favorited",
]);

/** POST /api/capture/events — analytics for capture funnel */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSupabaseAuthUserId(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getCaptureServiceClient();
    if (!supabase) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const body = (await req.json()) as {
      captureId?: string;
      eventType?: string;
      sourceApp?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.eventType || !ALLOWED.has(body.eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const { error } = await supabase.from("capture_events").insert({
      user_id: userId,
      capture_id: body.captureId || null,
      event_type: body.eventType,
      source_app: body.sourceApp || "ios_app",
      metadata: body.metadata || {},
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = captureApiErrorMessage(e, "Event failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

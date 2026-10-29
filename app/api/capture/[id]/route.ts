export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 10;

import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import {
  isCaptureEnrichmentIncomplete,
  recoverCaptureEnrichment,
} from "../../../../lib/capture";
import { buildTxMatchCopyFromCapture, buildTxMatchLinks } from "../../../../lib/tx-match-copy";
import {
  captureApiErrorMessage,
  getCaptureServiceClient,
} from "../../../../lib/capture-api-client";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/capture/[id] — also recovers stalled enrichment without re-sharing */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSupabaseAuthUserId(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getCaptureServiceClient();
    if (!supabase) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const { data, error } = await supabase
      .from("external_captures")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (isCaptureEnrichmentIncomplete(data as Record<string, unknown>)) {
      after(() => {
        void recoverCaptureEnrichment(supabase, userId, id);
      });
    }

    return NextResponse.json({
      capture: data,
      copy: buildTxMatchCopyFromCapture(data as Record<string, unknown>),
      links: buildTxMatchLinks(data.id),
    });
  } catch (e) {
    const message = captureApiErrorMessage(e, "Fetch failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/capture/[id] — remove an Inspiration for the signed-in owner */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSupabaseAuthUserId(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getCaptureServiceClient();
    if (!supabase) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const { data, error } = await supabase
      .from("external_captures")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    const message = captureApiErrorMessage(e, "Delete failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

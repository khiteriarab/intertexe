export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUserId } from "../../../../../lib/supabase-auth-server";
import { decodeCapture } from "../../../../../lib/capture";
import { buildTxMatchCopyFromCapture, buildTxMatchLinks } from "../../../../../lib/tx-match-copy";
import {
  captureApiErrorMessage,
  getCaptureServiceClient,
} from "../../../../../lib/capture-api-client";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/capture/[id]/decode — Find Better */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSupabaseAuthUserId(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getCaptureServiceClient();
    if (!supabase) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const capture = await decodeCapture(supabase, userId, id, {
      accessToken: token,
      siteOrigin: new URL(req.url).origin,
      findAlternatives: true,
    });

    return NextResponse.json({
      ok: true,
      capture,
      copy: buildTxMatchCopyFromCapture(capture as Record<string, unknown>),
      links: buildTxMatchLinks((capture as { id?: string }).id),
    });
  } catch (e) {
    const message = captureApiErrorMessage(e, "Decode failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

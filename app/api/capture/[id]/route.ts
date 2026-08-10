export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import {
  isCaptureEnrichmentIncomplete,
  recoverCaptureEnrichment,
} from "../../../../lib/capture";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

function userClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
    const supabase = userClient(token);
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
      const bg = getServerSupabase() || supabase;
      after(() => {
        void recoverCaptureEnrichment(bg, userId, id);
      });
    }

    return NextResponse.json({ capture: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fetch failed";
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
    const supabase = userClient(token);
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
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

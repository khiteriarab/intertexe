export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthUserId } from "../../../../../lib/supabase-auth-server";
import { decodeCapture } from "../../../../../lib/capture";
import { buildTxMatchCopyFromCapture } from "../../../../../lib/tx-match-copy";

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

/** POST /api/capture/[id]/decode — Find Better */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSupabaseAuthUserId(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = userClient(token);
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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Decode failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

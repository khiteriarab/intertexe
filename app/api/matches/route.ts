export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createHash } from "crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { decodeCapture, insertCapture, type CreateCaptureInput } from "../../../lib/capture";
import { PUBLIC_MATCH_OWNER, publicMatchResponse } from "../../../lib/public-match-set";
import { getServerSupabase } from "../../../lib/supabase-service-client";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function publicOwner(ip: string): string {
  const hash = createHash("sha256").update(`itx-match:${ip}`).digest("hex").slice(0, 24);
  return `${PUBLIC_MATCH_OWNER}_${hash}`;
}

/** POST /api/matches — create a public match set without signing in. */
export async function POST(req: NextRequest) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const body = (await req.json()) as CreateCaptureInput;
    if (!body.originalUrl && !body.imageUrl && !body.imageStoragePath && !body.imageBase64) {
      return NextResponse.json(
        { error: "originalUrl, imageUrl, or imageBase64 required" },
        { status: 400 }
      );
    }

    const owner = publicOwner(clientIp(req));
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("external_captures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", owner)
      .gte("created_at", since);
    if ((count || 0) >= 30) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { capture, duplicate } = await insertCapture(supabase, owner, {
      ...body,
      sourceApp: body.sourceApp || "chrome_extension",
      itemType: body.itemType || "external_product",
      decodeNow: true,
    });

    const existingAlts = Array.isArray((capture as { alternatives?: unknown[] }).alternatives)
      ? ((capture as { alternatives?: unknown[] }).alternatives as unknown[])
      : [];
    const queueDecode = !duplicate || existingAlts.length === 0;
    const captureId = String((capture as { id: string }).id);
    if (queueDecode) {
      after(() =>
        decodeCapture(supabase, owner, captureId, { findAlternatives: true }).catch((e) => {
          console.error("[matches] decodeCapture failed", captureId, e);
        })
      );
    }

    return NextResponse.json({
      ok: true,
      duplicate,
      public: true,
      ...publicMatchResponse(capture as Record<string, unknown>),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Match set failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

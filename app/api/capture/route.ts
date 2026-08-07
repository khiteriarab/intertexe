export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthUserId } from "../../../lib/supabase-auth-server";
import {
  insertCapture,
  decodeCapture,
  enrichCaptureMetadata,
  type CreateCaptureInput,
} from "../../../lib/capture";
import { getServerSupabase } from "../../../lib/supabase-service-client";

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

/**
 * POST /api/capture
 * Create an external capture (URL and/or image). Never writes to live catalog.
 *
 * Body: {
 *   originalUrl?, imageUrl?, title?, retailer?, brandName?, price?, currency?,
 *   description?, compositionText?, sku?, collectionId?, decodeNow?,
 *   sourceApp?, itemType?
 * }
 *
 * Returns the capture immediately. Async (via after()): always light OG/title/image
 * enrichment; TX Match alternatives when decodeNow / decode_requested.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getSupabaseAuthUserId(token);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = userClient(token);
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

    // Rate limit: max 30 captures / hour / user
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("external_captures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count || 0) >= 30) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const service = getServerSupabase();
    const { capture, duplicate } = await insertCapture(supabase, userId, body, {
      serviceClient: service,
    });

    // Keep work alive after the response on Vercel — bare `void` is often killed
    // mid-enrichment, which leaves Inspirations stuck on hostname placeholders.
    if (!duplicate) {
      const bgClient = service || supabase;
      const origin = new URL(req.url).origin;
      const captureId = capture.id;
      if (body.decodeNow) {
        after(() =>
          decodeCapture(bgClient, userId, captureId, {
            accessToken: token,
            siteOrigin: origin,
            findAlternatives: true,
          }).catch((e) => {
            console.error("[capture] decodeCapture failed", captureId, e);
          })
        );
      } else {
        after(() =>
          enrichCaptureMetadata(bgClient, userId, captureId).catch((e) => {
            console.error("[capture] enrichCaptureMetadata failed", captureId, e);
          })
        );
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate,
      capture,
      copy: {
        decodeAction: "TX MATCH",
        decodeSupporting: "More like this, made for you.",
        alternativesTitle: "Your TX Matches",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Capture failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/capture — list recent captures for the signed-in user */
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getSupabaseAuthUserId(token);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = userClient(token);
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") || 20));
    const { data, error } = await supabase
      .from("external_captures")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ captures: data || [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

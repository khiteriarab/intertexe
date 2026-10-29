export const dynamic = "force-dynamic";
export const revalidate = 0;
/** Keep list/create under Fluid caps; iOS cancels slow Inspirations fetches. */
export const maxDuration = 10;

import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAuthUserId } from "../../../lib/supabase-auth-server";
import {
  insertCapture,
  decodeCapture,
  enrichCaptureMetadata,
  isCaptureEnrichmentIncomplete,
  recoverCaptureEnrichment,
  type CreateCaptureInput,
} from "../../../lib/capture";
import {
  canonicalizeCaptureImageUrl,
  isUsableCaptureImageUrl,
} from "../../../lib/capture-enrichment";
import { buildTxMatchCopyFromCapture, buildTxMatchLinks } from "../../../lib/tx-match-copy";
import {
  captureApiErrorMessage,
  getCaptureServiceClient,
} from "../../../lib/capture-api-client";

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

    // Service role + explicit userId scope — authenticated GRANTs were revoked
    // by the Oct 20 RLS lockdown on external_captures.
    const supabase = getCaptureServiceClient();
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

    const { capture, duplicate } = await insertCapture(supabase, userId, body, {
      serviceClient: supabase,
    });

    // Keep work alive after the response on Vercel — bare `void` is often killed
    // mid-enrichment, which leaves Inspirations stuck on hostname placeholders.
    const origin = new URL(req.url).origin;
    const captureId = capture.id;
    const existingAlts = Array.isArray((capture as { alternatives?: unknown[] }).alternatives)
      ? ((capture as { alternatives?: unknown[] }).alternatives as unknown[])
      : [];
    const queueDecode =
      Boolean(body.decodeNow) && (!duplicate || existingAlts.length === 0);
    if (!duplicate || queueDecode) {
      if (queueDecode) {
        after(() =>
          decodeCapture(supabase, userId, captureId, {
            accessToken: token,
            siteOrigin: origin,
            findAlternatives: true,
          }).catch((e) => {
            console.error("[capture] decodeCapture failed", captureId, e);
          })
        );
      } else if (!duplicate) {
        after(() =>
          enrichCaptureMetadata(supabase, userId, captureId).catch((e) => {
            console.error("[capture] enrichCaptureMetadata failed", captureId, e);
          })
        );
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate,
      capture,
      copy: buildTxMatchCopyFromCapture(capture as Record<string, unknown>),
      links: buildTxMatchLinks((capture as { id?: string }).id),
    });
  } catch (e) {
    const message = captureApiErrorMessage(e, "Capture failed");
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
    const supabase = getCaptureServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") || 20));
    // Narrow select (no heavy alternatives jsonb) — list must stay under the 5s
    // Supabase abort so iOS does not surface URLError.cancelled on Inspirations.
    const { data, error } = await supabase
      .from("external_captures")
      .select(
        "id, user_id, created_at, updated_at, original_url, canonical_url, image_url, title, brand_name, retailer, price, currency, composition_text, enrichment_status, enrichment_locked_at, resolution_status, source_app"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // List payloads omit full TX Match arrays (detail GET still returns them) so
    // Inspirations stays fast and resilient to alternative-shape drift.
    const captures = (data || []).map((row) => {
      const pageUrl = String(row.canonical_url || row.original_url || "");
      const fixedImage =
        canonicalizeCaptureImageUrl(row.image_url as string | null, pageUrl) ||
        (isUsableCaptureImageUrl(row.image_url as string | null, pageUrl)
          ? (row.image_url as string)
          : null);
      const ready = String(row.resolution_status || "") === "alternatives_ready";
      return {
        ...(row as Record<string, unknown>),
        image_url: fixedImage,
        // Keep key for older iOS decoders; detail GET still returns the real array.
        alternatives: [] as unknown[],
        alternatives_count: ready ? 1 : 0,
      };
    });

    // Kick stalled enrichment/recovery so hostname-only rows finish after list open.
    const incomplete = (data || []).filter((c) =>
      isCaptureEnrichmentIncomplete(c as Record<string, unknown>)
    );
    if (incomplete.length) {
      after(() => {
        for (const c of incomplete.slice(0, 3)) {
          void recoverCaptureEnrichment(supabase, userId, String(c.id));
        }
      });
    }

    return NextResponse.json(
      { captures },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const message = captureApiErrorMessage(e, "List failed");
    const aborted =
      name === "AbortError" ||
      name === "TimeoutError" ||
      /abort|cancel/i.test(message);
    // Do not echo raw "cancelled"/AbortError to clients — iOS shows that as the
    // Inspirations empty-state title.
    return NextResponse.json(
      { error: aborted ? "Inspirations are taking too long — try again" : message },
      { status: aborted ? 503 : 500 }
    );
  }
}

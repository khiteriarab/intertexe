export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse, after } from "next/server";
import {
  isCaptureEnrichmentIncomplete,
  recoverCaptureEnrichment,
} from "../../../../lib/capture";
import { loadPublicCapture, publicMatchResponse } from "../../../../lib/public-match-set";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

type Ctx = { params: Promise<{ id: string }> };

function malformedId(id: string): boolean {
  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** GET /api/matches/[id] — public original piece + TX Matches. No session required. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id || malformedId(id)) {
      return NextResponse.json({ error: "Not found", reason: "malformed" }, { status: 404 });
    }

    const row = await loadPublicCapture(id);
    if (!row) {
      return NextResponse.json({ error: "Not found", reason: "missing" }, { status: 404 });
    }

    if (isCaptureEnrichmentIncomplete(row)) {
      const bg = getServerSupabase();
      const userId = String(row.user_id || "");
      if (bg && userId) {
        after(() => {
          void recoverCaptureEnrichment(bg, userId, id);
        });
      }
    }

    return NextResponse.json(publicMatchResponse(row), {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fetch failed";
    return NextResponse.json({ error: message, reason: "failed" }, { status: 500 });
  }
}

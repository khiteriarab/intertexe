import { NextRequest, NextResponse } from "next/server";
import { lookupDemoComposition } from "../../../../../lib/platform-demo";
import { clientIpFromHeaders, demoRateLimit } from "../../../../../lib/platform-demo-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function rateHeaders(limit: number, remaining: number, resetAt: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  };
}

type Ctx = { params: Promise<{ gtin: string }> };

/** GET /api/v1/demo/composition/{gtin} — read-only demonstration data. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = demoRateLimit(clientIpFromHeaders(req.headers));
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: "Rate limit reached",
        notice: "This demonstration endpoint is read-only and rate-limited.",
      },
      {
        status: 429,
        headers: {
          ...rateHeaders(limited.limit, 0, limited.resetAt),
          "Cache-Control": "no-store",
          "Retry-After": String(Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000))),
        },
      }
    );
  }

  const { gtin } = await ctx.params;
  const record = lookupDemoComposition(gtin);
  return NextResponse.json(record, {
    status: 200,
    headers: rateHeaders(limited.limit, limited.remaining, limited.resetAt),
  });
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed. This demo API is read-only." }, { status: 405 });
}

import { NextRequest, NextResponse } from "next/server";
import { parseGtin } from "../../../../../../lib/gtin";
import { demoNotFound, lookupDemoRecord } from "../../../../../../lib/material-intelligence/demo-records";
import { errorEnvelope, newRequestId, successEnvelope } from "../../../../../../lib/material-intelligence/envelope";
import { clientIpFromHeaders, demoRateLimit } from "../../../../../../lib/platform-demo-rate-limit";
import { demoRequestHasForbiddenOrgSelector } from "../../../../../../lib/enterprise/demo-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function headers(requestId: string, extra: Record<string, string> = {}) {
  return {
    "X-Request-ID": requestId,
    "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    ...extra,
  };
}

type Ctx = { params: Promise<{ gtin: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  if (demoRequestHasForbiddenOrgSelector(req.nextUrl.searchParams)) {
    return NextResponse.json(
      errorEnvelope(requestId, "invalid_request", "Demonstration does not accept organization selectors."),
      { status: 400, headers: headers(requestId, { "Cache-Control": "no-store" }) }
    );
  }
  const limited = demoRateLimit(clientIpFromHeaders(req.headers));
  if (!limited.ok) {
    return NextResponse.json(errorEnvelope(requestId, "rate_limited", "Rate limit reached."), {
      status: 429,
      headers: {
        ...headers(requestId, { "Cache-Control": "no-store", "Retry-After": "60" }),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  const { gtin: raw } = await ctx.params;
  const decoded = decodeURIComponent(raw || "");
  const allowlisted = lookupDemoRecord(decoded);
  if (allowlisted) {
    return NextResponse.json(successEnvelope(requestId, allowlisted), {
      status: 200,
      headers: headers(requestId, {
        "X-RateLimit-Limit": String(limited.limit),
        "X-RateLimit-Remaining": String(limited.remaining),
      }),
    });
  }

  const parsed = parseGtin(decoded);
  if (!parsed.ok) {
    return NextResponse.json(
      errorEnvelope(
        requestId,
        "invalid_gtin",
        "Provide a checksum-valid GTIN-8, GTIN-12, GTIN-13 or GTIN-14, or a curated sample identifier."
      ),
      { status: 422, headers: headers(requestId, { "Cache-Control": "no-store" }) }
    );
  }

  return NextResponse.json(successEnvelope(requestId, demoNotFound(parsed.gtin)), {
    status: 200,
    headers: headers(requestId),
  });
}

export async function POST() {
  return NextResponse.json(
    { error: { code: "method_not_allowed", message: "This demonstration endpoint is read-only." } },
    { status: 405 }
  );
}

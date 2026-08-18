import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGtin } from "../../../../../lib/gtin";
import { authenticateMaterialKey, enforceRateLimit, logMaterialUsage } from "../../../../../lib/material-intelligence/auth";
import { errorEnvelope, newRequestId, successEnvelope } from "../../../../../lib/material-intelligence/envelope";
import { lookupProductionComposition } from "../../../../../lib/material-intelligence/lookup";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "https://www.intertexe.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number, requestId: string, extra: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...CORS,
      "X-Request-ID": requestId,
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Ctx = { params: Promise<{ gtin: string }> };

export async function handleAuthenticatedCompositionGet(
  req: NextRequest,
  ctx: Ctx,
  supabase: SupabaseClient | null
) {
  const started = Date.now();
  const requestId = newRequestId();
  if (!supabase) {
    return json(errorEnvelope(requestId, "unavailable", "Service unavailable."), 503, requestId);
  }

  const auth = await authenticateMaterialKey(supabase, req.headers.get("authorization"));
  if (!auth.ok) {
    return json(errorEnvelope(requestId, auth.code, auth.message), auth.status, requestId);
  }

  const limited = await enforceRateLimit(supabase, auth);
  if (!limited.ok) {
    await logMaterialUsage(supabase, {
      clientId: auth.clientId,
      keyId: auth.keyId,
      requestId,
      gtinLength: null,
      statusCode: 429,
      latencyMs: Date.now() - started,
    }).catch(() => {});
    return json(errorEnvelope(requestId, "rate_limited", "Rate limit reached."), 429, requestId, {
      "Retry-After": String(limited.retryAfter),
      "X-RateLimit-Limit": String(auth.rateLimitPerMinute),
      "X-RateLimit-Remaining": "0",
    });
  }

  const { gtin: raw } = await ctx.params;
  const parsed = parseGtin(raw);
  if (!parsed.ok) {
    await logMaterialUsage(supabase, {
      clientId: auth.clientId,
      keyId: auth.keyId,
      requestId,
      gtinLength: null,
      statusCode: 422,
      latencyMs: Date.now() - started,
    }).catch(() => {});
    return json(
      errorEnvelope(
        requestId,
        "invalid_gtin",
        "Provide a checksum-valid GTIN-8, GTIN-12, GTIN-13 or GTIN-14. Leading zeroes are significant."
      ),
      422,
      requestId
    );
  }

  try {
    const data = await lookupProductionComposition(supabase, parsed.gtin);
    await logMaterialUsage(supabase, {
      clientId: auth.clientId,
      keyId: auth.keyId,
      requestId,
      gtinLength: parsed.length,
      matchStatus: data.match_status,
      matchType: data.match_type,
      evidenceStatus: data.evidence.status,
      statusCode: 200,
      latencyMs: Date.now() - started,
    }).catch(() => {});
    await supabase
      .from("material_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", auth.keyId)
      .then(() => {});
    return json(successEnvelope(requestId, data), 200, requestId, {
      "X-RateLimit-Limit": String(auth.rateLimitPerMinute),
      "X-RateLimit-Remaining": String(limited.remaining),
    });
  } catch {
    return json(errorEnvelope(requestId, "lookup_failed", "Lookup failed."), 500, requestId);
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return handleAuthenticatedCompositionGet(req, ctx, getServerSupabase());
}

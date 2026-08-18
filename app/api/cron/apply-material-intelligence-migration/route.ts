export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { applyMaterialIntelligenceMigration } from "../../../../lib/apply-material-intelligence-migration";

function applyToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return (match?.[1] || request.headers.get("x-itx-apply-token") || "").trim();
}

function authorize(request: Request): NextResponse | null {
  const token = applyToken(request);
  const allowed = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());
  if (!allowed.length) {
    return NextResponse.json({ error: "No apply credential configured" }, { status: 500 });
  }
  if (!token || !allowed.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Ops: apply 20260819 Material Intelligence API tables. Unscheduled. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  try {
    const result = await applyMaterialIntelligenceMigration();
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

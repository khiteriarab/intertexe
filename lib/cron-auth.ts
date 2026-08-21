import { NextResponse } from "next/server";

export function authorizeCron(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function getWeekNumber(date = new Date()): number {
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}

export function presentedOpsSecret(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth && /^Bearer\s+/i.test(auth)) {
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }
  const alt = request.headers.get("x-intertexe-ops")?.trim();
  return alt || null;
}

export function jwtRoleClaim(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
    };
    return json.role ? String(json.role) : null;
  } catch {
    return null;
  }
}

/** True when `token` is a live service_role key for this project's Supabase. */
export async function isLiveSupabaseServiceRole(token: string): Promise<boolean> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(
    /\/$/,
    ""
  );
  if (!url || !token) return false;
  if (jwtRoleClaim(token) !== "service_role") return false;
  try {
    const res = await fetch(`${url}/rest/v1/weekly_edit_queue?select=week_number&limit=1`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function authorizeWeeklyEditPreview(
  request: Request
): Promise<NextResponse | null> {
  const denied = authorizeCron(request);
  if (!denied) return null;
  const presented = presentedOpsSecret(request);
  if (presented && (await isLiveSupabaseServiceRole(presented))) return null;
  return denied;
}

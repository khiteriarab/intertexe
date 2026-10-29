export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";

/**
 * Clears a Supabase session when refresh+access tokens are provided.
 * `scope: "local"` (Safari / Chrome extension) ends only this session —
 * it must not globally kill the iOS app or other devices.
 * Default remains `global` for website account sign-out.
 */
export async function POST(request: NextRequest) {
  const accessToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const body = await request.json().catch(() => ({}));
  const refreshToken = String(body.refreshToken || body.refresh_token || "").trim();
  const scope = String(body.scope || "global").toLowerCase() === "local" ? "local" : "global";
  const client = getSupabaseAnonAuthClient();
  if (client && accessToken && refreshToken) {
    await client.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch(() => null);
    await client.auth.signOut({ scope }).catch(() => null);
  }
  return NextResponse.json({ message: "Logged out", scope });
}

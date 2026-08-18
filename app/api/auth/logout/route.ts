export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";

/** Clears the Supabase session when refresh+access tokens are provided. Local storage is cleared by the client. */
export async function POST(request: NextRequest) {
  const accessToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const body = await request.json().catch(() => ({}));
  const refreshToken = String(body.refreshToken || body.refresh_token || "").trim();
  const client = getSupabaseAnonAuthClient();
  if (client && accessToken && refreshToken) {
    await client.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch(() => null);
    await client.auth.signOut({ scope: "global" }).catch(() => null);
  }
  return NextResponse.json({ message: "Logged out" });
}

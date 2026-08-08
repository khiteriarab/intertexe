export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";

/**
 * POST /api/auth/refresh
 * Exchange a Supabase refresh_token for a new access (+ refresh) token.
 * Used by the Chrome extension so customers are not forced to re-login every hour.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const refreshToken = String(body.refreshToken || body.refresh_token || "").trim();
    if (!refreshToken) {
      return NextResponse.json({ message: "refreshToken required" }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Auth unavailable" }, { status: 503 });
    }

    const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session?.access_token) {
      return NextResponse.json(
        { message: error?.message || "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token: data.session.access_token,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token || refreshToken,
      expiresAt: data.session.expires_at ?? null,
    });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}

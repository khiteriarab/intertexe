import { NextRequest, NextResponse } from "next/server";
import { HQ_SESSION_COOKIE, writeAuthAudit } from "../../../../lib/dashboard/auth";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(HQ_SESSION_COOKIE)?.value;
  if (token) {
    const auth = getSupabaseAnonAuthClient();
    if (auth) {
      const { data } = await auth.auth.getUser(token);
      await writeAuthAudit({
        authUserId: data.user?.id,
        email: data.user?.email,
        eventName: "logout",
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(HQ_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

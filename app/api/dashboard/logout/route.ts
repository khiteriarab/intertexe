import { NextRequest, NextResponse } from "next/server";
import { HQ_SESSION_COOKIE, writeAuthAudit, clearHqSessionMemo } from "../../../../lib/dashboard/auth";
import { ENTERPRISE_SESSION_COOKIE } from "../../../../lib/enterprise/constants";
import { revokeHandoffSessionsForHqUser } from "../../../../lib/enterprise/identity-links";
import { revokeMintedEnterpriseSession } from "../../../../lib/enterprise/handoff";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const hqToken = request.cookies.get(HQ_SESSION_COOKIE)?.value;
  const enterpriseToken = request.cookies.get(ENTERPRISE_SESSION_COOKIE)?.value;
  if (hqToken) {
    const auth = getSupabaseAnonAuthClient();
    const hqAdmin = getServerSupabase();
    if (auth) {
      const { data } = await auth.auth.getUser(hqToken);
      if (data.user?.id) {
        await revokeHandoffSessionsForHqUser(data.user.id);
      }
      await writeAuthAudit({
        authUserId: data.user?.id,
        email: data.user?.email,
        eventName: "logout",
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
    }
    if (hqAdmin) {
      await hqAdmin.auth.admin.signOut(hqToken, "local").catch(() => undefined);
    }
    clearHqSessionMemo(hqToken);
  }
  await revokeMintedEnterpriseSession(enterpriseToken || null);

  const response = NextResponse.json({ ok: true });
  const clear = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(HQ_SESSION_COOKIE, "", clear);
  response.cookies.set(ENTERPRISE_SESSION_COOKIE, "", clear);
  return response;
}

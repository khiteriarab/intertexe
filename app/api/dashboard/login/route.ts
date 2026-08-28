import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import {
  HQ_FOUNDER_EMAILS,
  HQ_SESSION_COOKIE,
  writeAuthAudit,
} from "../../../../lib/dashboard/auth";
import { getEnterpriseAnonClient, getEnterpriseUserClient } from "../../../../lib/enterprise/client";
import { ENTERPRISE_SESSION_COOKIE } from "../../../../lib/enterprise/constants";
import { isLinkedEnterprisePrincipal } from "../../../../lib/enterprise/identity-links";
import {
  listEnterpriseMembershipsForUser,
  resolvePostLoginPath,
} from "../../../../lib/enterprise/memberships";

export const dynamic = "force-dynamic";

function cookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function safeNext(raw: unknown): string | null {
  const next = String(raw || "").trim();
  if (!next.startsWith("/dashboard") || next.startsWith("/dashboard/login")) return null;
  if (next.includes("//") || next.includes("\\")) return null;
  return next;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const next = safeNext(body.next);
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Auth is not configured." }, { status: 503 });
    }

    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    let hqAllowed = false;
    if (!error && data.session?.access_token && data.user) {
      const supabase = getServerSupabase();
      if (supabase) {
        const { data: internal } = await supabase
          .from("hq_internal_users")
          .select("id, is_active, workspace_id")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();
        hqAllowed = Boolean(internal?.is_active) || HQ_FOUNDER_EMAILS.has(email);
        if (internal?.is_active) {
          await supabase
            .from("hq_internal_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", internal.id);
        }
      } else if (HQ_FOUNDER_EMAILS.has(email)) {
        hqAllowed = true;
      }

      if (hqAllowed) {
        const redirectTo = resolvePostLoginPath({ next, hq: true, memberships: [] });
        await writeAuthAudit({
          authUserId: data.user.id,
          email,
          eventName: "login_success",
          ip: request.headers.get("x-forwarded-for"),
          userAgent: request.headers.get("user-agent"),
        });
        const response = NextResponse.json({
          ok: true,
          email: data.user.email,
          name: data.user.user_metadata?.name || null,
          redirectTo,
        });
        response.cookies.set(HQ_SESSION_COOKIE, data.session.access_token, cookieOptions());
        response.cookies.set(ENTERPRISE_SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
        return response;
      }
    }

    const enterpriseAuth = getEnterpriseAnonClient();
    if (enterpriseAuth) {
      const enterprise = await enterpriseAuth.auth.signInWithPassword({ email, password });
      if (enterprise.data.session?.access_token && enterprise.data.user?.id) {
        if (await isLinkedEnterprisePrincipal(enterprise.data.user.id)) {
          return NextResponse.json(
            { message: "This account is not authorized." },
            { status: 403 }
          );
        }
        const memberships = await listEnterpriseMembershipsForUser(
          getEnterpriseUserClient(enterprise.data.session.access_token)
        );
        if (!memberships.length) {
          return NextResponse.json(
            { message: "This account is not authorized." },
            { status: 403 }
          );
        }
        const redirectTo = resolvePostLoginPath({ next, hq: false, memberships });
        const response = NextResponse.json({
          ok: true,
          email: enterprise.data.user.email,
          name: enterprise.data.user.user_metadata?.name || null,
          redirectTo,
        });
        response.cookies.set(
          ENTERPRISE_SESSION_COOKIE,
          enterprise.data.session.access_token,
          cookieOptions()
        );
        response.cookies.set(HQ_SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
        return response;
      }
    }

    if (error || !data.session) {
      await writeAuthAudit({
        email,
        eventName: "login_failed",
        metadata: { reason: error?.message || "invalid_credentials" },
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    await writeAuthAudit({
      authUserId: data.user?.id,
      email,
      eventName: "login_denied",
      metadata: { reason: "not_internal_or_enterprise" },
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ message: "This account is not authorized." }, { status: 403 });
  } catch {
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

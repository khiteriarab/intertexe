import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import {
  HQ_FOUNDER_EMAILS,
  HQ_SESSION_COOKIE,
  writeAuthAudit,
} from "../../../../lib/dashboard/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Auth is not configured." }, { status: 503 });
    }

    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token || !data.user) {
      await writeAuthAudit({
        email,
        eventName: "login_failed",
        metadata: { reason: error?.message || "invalid_credentials" },
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const supabase = getServerSupabase();
    let allowed = false;
    if (supabase) {
      const { data: internal } = await supabase
        .from("hq_internal_users")
        .select("id, is_active, workspace_id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();
      allowed = Boolean(internal?.is_active) || HQ_FOUNDER_EMAILS.has(email);
      if (internal?.is_active) {
        await supabase
          .from("hq_internal_users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", internal.id);
      }
    } else if (HQ_FOUNDER_EMAILS.has(email)) {
      allowed = true;
    }

    if (!allowed) {
      await writeAuthAudit({
        authUserId: data.user.id,
        email,
        eventName: "login_denied",
        metadata: { reason: "not_internal_user" },
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json(
        { message: "This account is not authorized for INTERTEXE HQ." },
        { status: 403 }
      );
    }

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
    });

    response.cookies.set(HQ_SESSION_COOKIE, data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

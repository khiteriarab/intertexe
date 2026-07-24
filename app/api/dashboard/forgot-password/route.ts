import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { writeAuthAudit } from "../../../../lib/dashboard/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Auth is not configured." }, { status: 503 });
    }

    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/dashboard/login?reset=1`;
    const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo });
    await writeAuthAudit({
      email,
      eventName: error ? "password_reset_failed" : "password_reset_requested",
      metadata: error ? { reason: error.message } : {},
    });

    // Always return success to avoid email enumeration.
    return NextResponse.json({
      ok: true,
      message: "If that account exists, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";

/**
 * Resend the Supabase Auth confirmation email only (SMTP → Resend).
 * Never sends Founder Welcome — that is claimed once at signup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Unable to resend confirmation" }, { status: 500 });
    }

    const { error } = await auth.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return NextResponse.json(
        { message: error.message || "Unable to resend confirmation" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Unable to resend confirmation" }, { status: 500 });
  }
}

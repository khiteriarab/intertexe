export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import { sendWelcomeEmail } from "../../../../server/resend";

/** Trigger branded welcome email (web signup + iOS registration). */
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const bearer = request.headers.get("authorization");
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
    const uid = token ? await getSupabaseAuthUserId(token) : null;

    const secret = process.env.WELCOME_EMAIL_SECRET || process.env.CRON_SECRET;
    const headerSecret = request.headers.get("x-welcome-secret");
    const secretOk = secret && headerSecret === secret;

    if (!uid && !secretOk) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await sendWelcomeEmail(cleanEmail, typeof name === "string" ? name : undefined);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-welcome error:", err);
    return NextResponse.json({ message: "Unable to send welcome email" }, { status: 500 });
  }
}

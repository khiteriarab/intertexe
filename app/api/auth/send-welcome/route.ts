export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUser } from "../../../../lib/supabase-auth-server";
import { sendWelcomeEmail } from "../../../../server/resend";
import { linkHqContactOnSignup } from "../../../../lib/hq-contacts";

/**
 * Trigger founder welcome for the authenticated user (iOS registration).
 *
 * Auth: Supabase JWT only.
 * Delivery: Loops transactional only (no Resend welcome).
 * Idempotent via email_deliveries (provider=loops).
 */
export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization");
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await getSupabaseAuthUser(token);
    if (!user?.id || !user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let bodyName: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.name === "string" && body.name.trim()) {
        bodyName = body.name.trim();
      }
    } catch {
      /* empty body is fine */
    }

    await linkHqContactOnSignup({ email: user.email, userId: user.id }).catch(() => null);

    const result = await sendWelcomeEmail({
      email: user.email,
      firstName: bodyName || user.firstName || "",
      userId: user.id,
      source: "ios_send_welcome",
    });

    return NextResponse.json({
      success: result.ok,
      skipped: Boolean(result.skipped),
      reason: result.reason || null,
      deliveryId: result.deliveryId || null,
    });
  } catch (err) {
    console.error("send-welcome error:", err);
    return NextResponse.json({ message: "Unable to send welcome email" }, { status: 500 });
  }
}

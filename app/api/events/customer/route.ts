export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUser } from "../../../../lib/supabase-auth-server";
import { emitHqCustomerEvent } from "../../../../lib/dashboard/events";

const ALLOWED_EVENTS = new Set([
  "signup",
  "account_created",
  "first_open",
  "first_scan",
  "affiliate_click",
  "product_saved",
]);

/**
 * First-party customer events from iOS (JWT-authenticated).
 * Ad platforms are not the source of truth — this ledger is.
 */
export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization");
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await getSupabaseAuthUser(token);
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ message: "Invalid eventName" }, { status: 400 });
    }

    const metadata =
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : {};

    const result = await emitHqCustomerEvent({
      customerId: user.id,
      eventName,
      eventCategory:
        typeof body.eventCategory === "string" ? body.eventCategory : "acquisition",
      source: typeof body.source === "string" ? body.source : "ios",
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      productId: typeof body.productId === "string" ? body.productId : undefined,
      campaignId: typeof body.campaignId === "string" ? body.campaignId : undefined,
      metadata,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.reason || "emit_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[events/customer]", err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

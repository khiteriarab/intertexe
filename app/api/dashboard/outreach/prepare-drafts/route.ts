import { NextResponse } from "next/server";
import { requireHqSession } from "@/lib/dashboard/auth";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { getValidAccessToken } from "@/lib/dashboard/integrations/connections";
import { prepareOutreachDrafts } from "@/lib/dashboard/gmail-prepare-drafts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Create personalized Gmail drafts from the founder’s template drafts.
 * Does NOT send. Founder reviews and presses Send in Gmail.
 */
export async function POST(request: Request) {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ message: "DB unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { limitPerType?: number };
  const limitPerType = Number(body.limitPerType);

  try {
    const { accessToken, metadata, connection } = await getValidAccessToken(
      supabase,
      session.workspaceId,
      "gmail"
    );
    const out = await prepareOutreachDrafts({
      supabase,
      workspaceId: session.workspaceId,
      accessToken,
      scopes: connection.scopes,
      fromEmail: connection.account_label || String(metadata.accountLabel || "") || null,
      limitPerType: Number.isFinite(limitPerType) ? limitPerType : 40,
    });

    const status = out.needsReconnect ? 409 : out.ok ? 200 : 422;
    return NextResponse.json(out, { status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Prepare drafts failed";
    const status = /not connected/i.test(message) ? 409 : 500;
    return NextResponse.json({ ok: false, message, created: 0, errors: [message] }, { status });
  }
}

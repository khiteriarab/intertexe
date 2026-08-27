import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";
import { upsertConnection, syncProvider } from "../../../../../lib/dashboard/integrations/connections";
import {
  chromeWebStoreBundle,
  parseOptionalCount,
} from "../../../../../lib/dashboard/integrations/providers/chrome-web-store";

export const dynamic = "force-dynamic";

/**
 * Chrome Web Store has no user OAuth or public installs API.
 * Body JSON: { listingId?, weeklyUsers?, weeklyInstalls?, accountLabel? }
 */
export async function POST(request: NextRequest) {
  const session = await requireHqSession();
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const listingId = String(body.listingId || "").trim();
  const accountLabel = String(body.accountLabel || "").trim();
  const weeklyUsers = parseOptionalCount(body.weeklyUsers);
  const weeklyInstalls = parseOptionalCount(body.weeklyInstalls);

  try {
    const bundle = chromeWebStoreBundle({
      listingId,
      weeklyUsers,
      weeklyInstalls,
      accountLabel: accountLabel || undefined,
    });
    await upsertConnection(supabase, {
      workspaceId: session.workspaceId,
      provider: "chrome_web_store",
      bundle,
      connectedByInternalUserId: session.internalUserId,
    });
    const sync = await syncProvider(supabase, session.workspaceId, "chrome_web_store");
    return NextResponse.json({ ok: true, sync });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect Chrome Web Store listing";
    return NextResponse.json({ message }, { status: 400 });
  }
}

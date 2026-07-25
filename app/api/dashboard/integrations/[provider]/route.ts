import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";
import {
  disconnectConnection,
  syncProvider,
} from "../../../../../lib/dashboard/integrations/connections";
import { isValidProvider } from "../../../../../lib/dashboard/integrations/registry";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const session = await requireHqSession();
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { provider: raw } = await context.params;
  if (!isValidProvider(raw)) {
    return NextResponse.json({ message: "Unknown provider" }, { status: 404 });
  }
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "disconnect");

  if (action === "sync") {
    const result = await syncProvider(supabase, session.workspaceId, raw);
    return NextResponse.json(result);
  }

  await disconnectConnection(supabase, session.workspaceId, raw);
  return NextResponse.json({ ok: true });
}

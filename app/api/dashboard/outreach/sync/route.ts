import { NextResponse } from "next/server";
import { requireHqSession } from "@/lib/dashboard/auth";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { syncProvider } from "@/lib/dashboard/integrations/connections";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Founder-triggered Gmail header sync. HQ session required. */
export async function POST() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ message: "DB unavailable" }, { status: 503 });
  }

  try {
    const out = await syncProvider(supabase, session.workspaceId, "gmail");
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gmail sync failed";
    const status = /not connected/i.test(message) ? 409 : 500;
    return NextResponse.json({ message }, { status });
  }
}

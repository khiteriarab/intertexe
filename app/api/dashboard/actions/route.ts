import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import {
  listFounderActions,
  updateFounderAction,
  type ActionStatus,
} from "../../../../lib/dashboard/action-center";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });
  const actions = await listFounderActions(supabase, session.workspaceId);
  return NextResponse.json({ actions });
}

export async function PATCH(request: NextRequest) {
  const session = await requireHqSession({ roles: ["founder", "admin"] });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const actionId = String(body.id || "");
  if (!actionId) return NextResponse.json({ message: "id required" }, { status: 400 });

  const patch: {
    status?: ActionStatus;
    snoozed_until?: string | null;
    assignee_internal_user_id?: string | null;
  } = {};

  if (body.status) patch.status = body.status as ActionStatus;
  if (body.action === "dismiss") patch.status = "cancelled";
  if (body.action === "complete") patch.status = "done";
  if (body.action === "start") patch.status = "in_progress";
  if (body.action === "snooze") {
    const days = Number(body.days || 3);
    patch.snoozed_until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  if (body.action === "assign_me") {
    patch.assignee_internal_user_id = session.internalUserId;
  }

  try {
    const updated = await updateFounderAction(supabase, session.workspaceId, actionId, patch);
    if (!updated) return NextResponse.json({ message: "Action not found" }, { status: 404 });
    return NextResponse.json({ ok: true, action: updated });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

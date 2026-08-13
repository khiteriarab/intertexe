import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["concept", "hook", "platform", "notes", "batch_id"] as const) {
    if (key in body) patch[key] = String(body[key] || "").trim() || null;
  }
  for (const key of ["filmed", "edited", "scheduled", "posted"] as const) {
    if (key in body) patch[key] = Boolean(body[key]);
  }
  if ("publishAt" in body) patch.publish_at = body.publishAt || null;
  if ("batchId" in body) patch.batch_id = String(body.batchId || "").trim() || null;

  const { data, error } = await supabase
    .from("hq_content_items")
    .update(patch)
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("hq_content_items")
    .select("*")
    .eq("workspace_id", session.workspaceId)
    .order("publish_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const concept = String(body.concept || "").trim();
  if (!concept) return NextResponse.json({ message: "Concept is required" }, { status: 400 });

  const row = {
    workspace_id: session.workspaceId,
    concept,
    hook: String(body.hook || "").trim() || null,
    platform: String(body.platform || "").trim() || null,
    filmed: Boolean(body.filmed),
    edited: Boolean(body.edited),
    scheduled: Boolean(body.scheduled),
    posted: Boolean(body.posted),
    publish_at: body.publishAt || null,
    batch_id: String(body.batchId || "").trim() || null,
    notes: String(body.notes || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("hq_content_items").insert(row).select("*").maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

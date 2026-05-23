export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../../lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ designerId: string }> }
) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ saved: false }, { status: 401 });

  const { designerId } = await params;
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ saved: false });

  const { data } = await supabase
    .from("user_saved_designers")
    .select("designer_name")
    .eq("user_id", String(user.id))
    .eq("designer_name", designerId)
    .limit(1);

  return NextResponse.json({ saved: !!(data && data.length > 0) });
}

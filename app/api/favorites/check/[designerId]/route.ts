import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../../lib/supabase-server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ designerId: string }> }) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ isFavorite: false });

  const { designerId } = await params;
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ isFavorite: false });

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("designer_id", designerId)
    .limit(1);

  return NextResponse.json({ isFavorite: (data?.length || 0) > 0 });
}

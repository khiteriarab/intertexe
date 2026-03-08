import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";
import { snakeToCamel } from "../../../../lib/case-utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json([], { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json([], { status: 500 });

  const { data } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(snakeToCamel(data || []));
}

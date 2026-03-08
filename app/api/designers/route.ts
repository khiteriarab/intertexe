import { NextRequest, NextResponse } from "next/server";
import { fetchDesigners } from "@/../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

  try {
    const designers = await fetchDesigners(query, limit);
    return NextResponse.json(designers);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchDesigners, fetchDesignersByNames, fetchDesignersByIds } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  const names = searchParams.get("names");
  const ids = searchParams.get("ids");

  try {
    if (ids) {
      const idList = ids.split(",").filter(Boolean).slice(0, 100);
      const designers = await fetchDesignersByIds(idList);
      return NextResponse.json(designers);
    }
    if (names) {
      const nameList = names.split(",").map(n => n.trim()).filter(Boolean);
      const designers = await fetchDesignersByNames(nameList);
      return NextResponse.json(designers);
    }
    const designers = await fetchDesigners(query, limit);
    return NextResponse.json(designers);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

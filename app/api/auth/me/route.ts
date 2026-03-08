import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  const { password: _, ...safeUser } = user;
  return NextResponse.json(safeUser);
}

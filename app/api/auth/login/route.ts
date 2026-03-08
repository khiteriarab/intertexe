import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Auth endpoints are handled by the Express backend during transition" }, { status: 501 });
}

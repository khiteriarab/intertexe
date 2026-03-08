import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../server/db";
import { authTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    db.delete(authTokens).where(eq(authTokens.token, token)).catch(() => {});
  }
  return NextResponse.json({ message: "Logged out" });
}

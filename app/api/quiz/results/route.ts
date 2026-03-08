import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { db } from "../../../../server/db";
import { quizResults } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json([], { status: 401 });

  const results = await db.select().from(quizResults).where(eq(quizResults.userId, user.id)).orderBy(desc(quizResults.createdAt));
  return NextResponse.json(results);
}

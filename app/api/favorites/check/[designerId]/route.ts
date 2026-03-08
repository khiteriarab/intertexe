import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth-helpers";
import { db } from "../../../../../server/db";
import { favorites } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ designerId: string }> }) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ isFavorite: false });

  const { designerId } = await params;
  const result = await db.select().from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.designerId, designerId))).limit(1);
  return NextResponse.json({ isFavorite: result.length > 0 });
}

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { db } from "../../../server/db";
import { favorites } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json([], { status: 401 });

  const result = await db.select().from(favorites).where(eq(favorites.userId, user.id));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { designerId } = await request.json();
  if (!designerId) return NextResponse.json({ message: "designerId required" }, { status: 400 });

  const existing = await db.select().from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.designerId, designerId))).limit(1);
  if (existing.length > 0) return NextResponse.json(existing[0]);

  const [fav] = await db.insert(favorites).values({ userId: user.id, designerId }).returning();
  return NextResponse.json(fav, { status: 201 });
}

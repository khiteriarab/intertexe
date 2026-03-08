import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { db } from "../../../server/db";
import { productFavorites } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });

  const result = await db.select().from(productFavorites).where(eq(productFavorites.userId, user.id));
  return NextResponse.json({ productIds: result.map(r => r.productId) });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ message: "productId required" }, { status: 400 });

  const existing = await db.select().from(productFavorites).where(and(eq(productFavorites.userId, user.id), eq(productFavorites.productId, productId))).limit(1);
  if (existing.length > 0) return NextResponse.json({ success: true });

  await db.insert(productFavorites).values({ userId: user.id, productId });
  return NextResponse.json({ success: true }, { status: 201 });
}

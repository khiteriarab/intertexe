import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { db } from "../../../../server/db";
import { productFavorites } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });

  const { productIds } = await request.json();
  if (!Array.isArray(productIds)) return NextResponse.json({ message: "productIds must be an array" }, { status: 400 });

  const existing = await db.select().from(productFavorites).where(eq(productFavorites.userId, user.id));
  const existingIds = new Set(existing.map(e => e.productId));

  const newIds = productIds.filter((id: string) => !existingIds.has(id));
  if (newIds.length > 0) {
    await db.insert(productFavorites).values(newIds.map((productId: string) => ({ userId: user.id, productId })));
  }

  const allFavs = await db.select().from(productFavorites).where(eq(productFavorites.userId, user.id));
  return NextResponse.json({ productIds: allFavs.map(f => f.productId) });
}

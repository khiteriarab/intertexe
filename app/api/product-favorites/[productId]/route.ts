import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { db } from "../../../../server/db";
import { productFavorites } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { productId } = await params;
  await db.delete(productFavorites).where(and(eq(productFavorites.userId, user.id), eq(productFavorites.productId, productId)));
  return NextResponse.json({ message: "Removed" });
}

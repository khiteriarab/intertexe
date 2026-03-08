import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { db } from "../../../../server/db";
import { favorites } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ designerId: string }> }) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { designerId } = await params;
  await db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.designerId, designerId)));
  return NextResponse.json({ message: "Removed" });
}

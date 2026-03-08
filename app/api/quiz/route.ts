import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { db } from "../../../server/db";
import { quizResults, users, analyticsEvents } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get("authorization"));
    const body = await request.json();
    const { materials, priceRange, syntheticTolerance, favoriteBrands, profileType, recommendation } = body;

    const [result] = await db.insert(quizResults).values({
      userId: user?.id || null,
      materials: materials || [],
      priceRange: priceRange || "",
      syntheticTolerance: syntheticTolerance || "",
      favoriteBrands: favoriteBrands || [],
      profileType: profileType || null,
      recommendation: recommendation || null,
    }).returning();

    if (user && profileType) {
      await db.update(users).set({ fabricPersona: profileType }).where(eq(users.id, user.id)).catch(() => {});
    }

    if (user) {
      db.insert(analyticsEvents).values({ event: "quiz_complete", userId: user.id }).catch(() => {});
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

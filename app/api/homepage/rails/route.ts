import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { buildPersonalizedHomepageRails } from "../../../../lib/homepage-rails-personalize";

export const dynamic = "force-dynamic";

/**
 * Personalized homepage rails for iOS/web.
 * Auth optional — signed-in users get favorited clothing/shoes merged to the front.
 * Never deletes favorites; availability gaps are reported only.
 */
export async function GET(request: NextRequest) {
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "12");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 12;

  try {
    const user = await getUserFromToken(request.headers.get("authorization"));
    const payload = await buildPersonalizedHomepageRails({
      userId: user?.id ? String(user.id) : null,
      limit,
    });

    return NextResponse.json(payload, {
      headers: {
        // Private when personalized — do not CDN-cache per-user rails.
        "Cache-Control": payload.personalized
          ? "private, no-store"
          : "public, s-maxage=120, stale-while-revalidate=300",
        Vary: "Authorization",
      },
    });
  } catch (err) {
    console.error("[homepage/rails] failed:", err);
    return NextResponse.json(
      { error: "Failed to build homepage rails" },
      { status: 500 }
    );
  }
}

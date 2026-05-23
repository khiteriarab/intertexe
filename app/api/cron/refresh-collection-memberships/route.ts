export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { refreshCollectionMemberships } from "../../../../lib/collection-memberships";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Rebuild collection_product_memberships from full catalog_list scans. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const slug = new URL(request.url).searchParams.get("slug") || undefined;

  try {
    const counts = await refreshCollectionMemberships(
      slug as import("../../../../lib/collection-pages").CollectionSlug | undefined
    );
    return NextResponse.json({ ok: true, counts, at: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireResaleUserId } from "../../../../../../lib/enterprise/resale-auth";
import { markResaleItemSold } from "../../../../../../lib/enterprise/resale-service";
import type { MarketplaceProvider } from "../../../../../../lib/resale/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requireResaleUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json()) as { provider?: MarketplaceProvider };
  if (!body.provider) return NextResponse.json({ error: "provider_required" }, { status: 400 });

  try {
    const result = await markResaleItemSold({
      resaleItemId: id,
      soldProvider: body.provider,
      userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "mark_sold_failed";
    const status = message.includes("duplicate") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

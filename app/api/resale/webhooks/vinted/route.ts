import { NextResponse } from "next/server";
import { processMarketplaceWebhook } from "../../../../../lib/enterprise/resale-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const externalEventId = String(payload.id || payload.event_id || Date.now());
  const eventType = String(payload.type || payload.event || "unknown");

  try {
    const result = await processMarketplaceWebhook({
      provider: "vinted",
      externalEventId,
      eventType,
      payload,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "webhook_failed" },
      { status: 500 }
    );
  }
}

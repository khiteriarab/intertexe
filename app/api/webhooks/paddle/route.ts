import { NextRequest, NextResponse } from "next/server";
import { getEnterpriseServiceClient } from "../../../../lib/enterprise/client";
import { handlePaddleWebhookEvent, verifyPaddleWebhookSignature } from "../../../../lib/enterprise/paddle";

export const dynamic = "force-dynamic";

/** Paddle Billing webhooks → sync org plan + billing_accounts. */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!verifyPaddleWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const client = getEnterpriseServiceClient();
  if (!client) {
    return NextResponse.json({ message: "Enterprise DB unavailable" }, { status: 503 });
  }

  const result = await handlePaddleWebhookEvent(client, event);
  return NextResponse.json({ ok: true, ...result });
}

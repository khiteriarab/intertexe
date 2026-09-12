import { NextResponse } from "next/server";
import { requireResaleUserId } from "../../../../lib/enterprise/resale-auth";
import { listMarketplaceConnections, upsertResaleProfile } from "../../../../lib/enterprise/resale-service";
import { getResaleProvider } from "../../../../lib/resale/providers";
import type { MarketplaceProvider } from "../../../../lib/resale/types";
import { getEnterpriseServiceClient } from "../../../../lib/enterprise/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await requireResaleUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await upsertResaleProfile(userId);
  const connections = await listMarketplaceConnections(userId);
  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const userId = await requireResaleUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { provider?: MarketplaceProvider; action?: string };
  const providerId = body.provider;
  if (!providerId) return NextResponse.json({ error: "provider_required" }, { status: 400 });

  const provider = getResaleProvider(providerId);
  await upsertResaleProfile(userId);

  if (body.action === "disconnect") {
    const supabase = getEnterpriseServiceClient();
    if (supabase) {
      await supabase
        .from("marketplace_connections")
        .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", providerId);
    }
    await provider.disconnectAccount({ userId });
    return NextResponse.json({ ok: true, status: "disconnected" });
  }

  const result = await provider.connectAccount({ userId, sandbox: true });
  return NextResponse.json(result);
}

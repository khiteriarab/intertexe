import { NextResponse } from "next/server";
import { requireResaleUserId } from "../../../../lib/enterprise/resale-auth";
import { getEnterpriseServiceClient } from "../../../../lib/enterprise/client";
import { getResaleProvider } from "../../../../lib/resale/providers";

export const dynamic = "force-dynamic";

/** Unified offers view — only marketplaces whose APIs expose offer data. */
export async function GET(request: Request) {
  const userId = await requireResaleUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const resaleItemId = url.searchParams.get("resaleItemId");
  if (!resaleItemId) return NextResponse.json({ error: "resaleItemId_required" }, { status: 400 });

  const supabase = getEnterpriseServiceClient();
  if (!supabase) return NextResponse.json({ offers: [], best: null });

  const { data: listings } = await supabase
    .from("resale_listings")
    .select("id, provider, external_listing_id, currency, asking_price, status")
    .eq("resale_item_id", resaleItemId);

  const offers: Array<{
    provider: string;
    amount: number;
    currency: string;
    available: boolean;
  }> = [];

  for (const listing of listings || []) {
    const provider = getResaleProvider(listing.provider);
    if (!provider.capabilities().offer_management || !provider.fetchOffers) {
      offers.push({
        provider: listing.provider,
        amount: Number(listing.asking_price || 0),
        currency: listing.currency || "USD",
        available: false,
      });
      continue;
    }
    const rows = await provider.fetchOffers({ userId }, listing.external_listing_id || "");
    for (const row of rows) {
      offers.push({
        provider: listing.provider,
        amount: row.amount,
        currency: row.currency,
        available: true,
      });
    }
  }

  const priced = offers.filter((o) => o.available && o.amount > 0);
  const best = priced.length
    ? priced.reduce((a, b) => (b.amount > a.amount ? b : a))
    : null;

  return NextResponse.json({ offers, best, autoAccept: false });
}

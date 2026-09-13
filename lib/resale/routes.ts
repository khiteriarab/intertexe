import type { ResaleRouteOption, ResaleValuation } from "./types";

function money(currency: string, amount: number, prefix = ""): string {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${prefix}${sym}${amount}`;
}

/** Compare resale routes — marketplace, instant buyout, consignment, brand trade-in. */
export function buildResaleRoutes(valuation: ResaleValuation, brand?: string | null): ResaleRouteOption[] {
  const { currency, estimatedValue } = valuation;
  const instant = Math.round(estimatedValue * 0.82);
  const consignment = Math.round(estimatedValue * 1.05);
  const tradeIn = Math.round(estimatedValue * 0.88);
  const marketplace = estimatedValue;

  const routes: ResaleRouteOption[] = [
    {
      id: "instant_buyout_a",
      routeKind: "instant_buyout",
      provider: "resale_partner_a",
      label: "Instant sale — Resale Partner A",
      youReceive: instant,
      youReceiveLabel: money(currency, instant),
      currency,
      speedLabel: "Today",
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      recommended: false,
      metadata: { placeholder: true, note: "Wire when partner API available" },
    },
    {
      id: "consignment_luxury",
      routeKind: "consignment",
      provider: "consignment_partner",
      label: "Consignment — luxury partner",
      youReceive: consignment,
      youReceiveLabel: money(currency, consignment, "~"),
      currency,
      speedLabel: "~14 days",
      estimatedDaysMin: 10,
      estimatedDaysMax: 18,
      recommended: valuation.marketDemand === "high",
      metadata: { commissionPct: 20, placeholder: true },
    },
    {
      id: "marketplace_ebay",
      routeKind: "marketplace_listing",
      provider: "ebay",
      label: `List on ${valuation.bestChannel}`,
      youReceive: marketplace,
      youReceiveLabel: money(currency, marketplace, "~"),
      currency,
      speedLabel: `~${valuation.typicalSellingDaysMin}–${valuation.typicalSellingDaysMax} days`,
      estimatedDaysMin: valuation.typicalSellingDaysMin,
      estimatedDaysMax: valuation.typicalSellingDaysMax,
      recommended: valuation.marketDemand !== "high",
      metadata: { channel: valuation.bestChannel },
    },
  ];

  if (brand) {
    routes.push({
      id: "brand_trade_in",
      routeKind: "brand_trade_in",
      provider: "brand",
      label: `${brand} trade-in credit`,
      youReceive: tradeIn,
      youReceiveLabel: `${money(currency, tradeIn)} credit`,
      currency,
      speedLabel: "Today",
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      recommended: false,
      metadata: { placeholder: true },
    });
  }

  if (!routes.some((r) => r.recommended) && routes.length) {
    routes[0]!.recommended = true;
  }

  return routes.sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
}

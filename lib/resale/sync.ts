import type { MarketplaceProvider } from "./types";

export type ResaleListingRow = {
  id: string;
  provider: MarketplaceProvider;
  external_listing_id: string | null;
  status: string;
};

export type MarkSoldResult = {
  itemStatus: "sold";
  deactivated: Array<{ provider: MarketplaceProvider; ok: boolean; message?: string }>;
  handoffActionRequired: MarketplaceProvider[];
};

/**
 * When one marketplace confirms sale, deactivate automated listings elsewhere.
 * Handoff providers (Poshmark) require seller manual action.
 */
export function planSoldSync(listings: ResaleListingRow[], soldProvider: MarketplaceProvider) {
  const automated = listings.filter(
    (l) => l.provider !== soldProvider && l.status === "published" && l.external_listing_id
  );
  const handoff = listings.filter(
    (l) => l.provider !== soldProvider && l.status === "handoff"
  );
  return {
    toDeactivate: automated,
    handoffActionRequired: handoff.map((l) => l.provider),
  };
}

export function webhookIdempotencyKey(provider: string, externalEventId: string, eventType: string): string {
  return `${provider}:${externalEventId || "unknown"}:${eventType}`;
}

export function isDuplicateSale(itemStatus: string): boolean {
  return itemStatus === "sold" || itemStatus === "transfer_pending" || itemStatus === "transferred";
}

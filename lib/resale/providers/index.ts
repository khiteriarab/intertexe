import type { MarketplaceProvider, ResaleProvider } from "../types";
import { ebayProvider } from "./ebay";
import { poshmarkProvider } from "./poshmark";
import { vintedProvider } from "./vinted";

const registry: Record<MarketplaceProvider, ResaleProvider> = {
  ebay: ebayProvider,
  vinted: vintedProvider,
  poshmark: poshmarkProvider,
};

export function getResaleProvider(id: MarketplaceProvider): ResaleProvider {
  return registry[id];
}

export function listResaleProviders(): ResaleProvider[] {
  return Object.values(registry);
}

export function providerSummaries() {
  return listResaleProviders().map((p) => ({
    id: p.id,
    displayName: p.displayName,
    integrationStatus: p.integrationStatus,
    capabilities: p.capabilities(),
  }));
}

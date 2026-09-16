import { customProvider } from "./custom";
import { ecoinventProvider, ECOINVENT_INTEGRATION_CARD } from "./ecoinvent";
import { greenStoryProvider, GREEN_STORY_INTEGRATION_CARD } from "./green-story";
import type { SustainabilityProviderAdapter } from "./types";
import { worldlyProvider, WORLDLY_INTEGRATION_CARD } from "./worldly";

export const SUSTAINABILITY_PROVIDERS: SustainabilityProviderAdapter[] = [
  worldlyProvider,
  greenStoryProvider,
  ecoinventProvider,
  customProvider,
];

const providerById = new Map(SUSTAINABILITY_PROVIDERS.map((p) => [p.id, p]));

export function getSustainabilityProvider(id: string): SustainabilityProviderAdapter | null {
  return providerById.get(id as SustainabilityProviderAdapter["id"]) || null;
}

export function providerAttribution(
  providerId: string,
  methodology?: string
): string {
  const provider = getSustainabilityProvider(providerId);
  return provider ? provider.sourceAttribution(methodology) : `Source: ${providerId}`;
}

export {
  customProvider,
  ecoinventProvider,
  ECOINVENT_INTEGRATION_CARD,
  greenStoryProvider,
  GREEN_STORY_INTEGRATION_CARD,
  worldlyProvider,
  WORLDLY_INTEGRATION_CARD,
};
export type { ProviderFetchContext, ProviderFetchResult, SustainabilityProviderAdapter } from "./types";

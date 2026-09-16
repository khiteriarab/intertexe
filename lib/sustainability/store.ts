import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMER_ZERO_SLUG, DEMO_BRAND_SLUG } from "../enterprise/constants";
import pilotImpact from "./fixtures/pilot-impact.json";
import type {
  FacilityImpactRow,
  MaterialImpactRow,
  ProductImpactRecord,
  ProviderConnectionState,
  SustainabilityProviderConnection,
  SustainabilityProviderId,
} from "./types";

type PilotImpactEntry = Omit<ProductImpactRecord, "productId">;

type PilotFixture = {
  byStyleCode: Record<string, PilotImpactEntry>;
  facilities: FacilityImpactRow[];
  materials: MaterialImpactRow[];
  providerConnections: Record<
    string,
    { credentialsConfigured: boolean; connectionState: ProviderConnectionState; lastSyncAt?: string }
  >;
};

const fixture = pilotImpact as PilotFixture;
const PILOT_SLUGS = new Set([CUSTOMER_ZERO_SLUG, DEMO_BRAND_SLUG]);

function isPilotOrg(slug: string): boolean {
  return PILOT_SLUGS.has(slug);
}

export async function loadProviderConnections(
  _client: SupabaseClient,
  _organizationId: string,
  slug: string
): Promise<SustainabilityProviderConnection[]> {
  const usePilot = isPilotOrg(slug);
  const worldly = fixture.providerConnections.worldly;
  const greenStory = fixture.providerConnections.green_story;
  return [
    {
      providerId: "worldly",
      label: "Worldly / Higg",
      connectionState: usePilot && worldly?.credentialsConfigured ? "connected" : "disconnected",
      credentialsConfigured: Boolean(usePilot && worldly?.credentialsConfigured),
      lastSyncAt: usePilot ? worldly?.lastSyncAt ?? null : null,
    },
    {
      providerId: "green_story",
      label: "Green Story",
      connectionState: usePilot && greenStory?.credentialsConfigured ? "connected" : "disconnected",
      credentialsConfigured: Boolean(usePilot && greenStory?.credentialsConfigured),
      lastSyncAt: usePilot ? greenStory?.lastSyncAt ?? null : null,
    },
    {
      providerId: "ecoinvent",
      label: "ecoinvent",
      connectionState: "disconnected",
      credentialsConfigured: false,
      lastSyncAt: null,
    },
  ];
}

export async function resolveStoredProductImpact(
  _client: SupabaseClient,
  _organizationId: string,
  slug: string,
  product: { id: string; style_code?: string | null; sku?: string | null }
): Promise<ProductImpactRecord | null> {
  if (!isPilotOrg(slug)) return null;
  const styleCode = String(product.style_code || "").trim();
  const entry = styleCode ? fixture.byStyleCode[styleCode] : null;
  if (!entry) return null;
  return { productId: product.id, ...entry };
}

export async function loadStoredFacilities(slug: string): Promise<FacilityImpactRow[]> {
  if (!isPilotOrg(slug)) return [];
  return fixture.facilities;
}

export async function loadStoredMaterials(slug: string): Promise<MaterialImpactRow[]> {
  if (!isPilotOrg(slug)) return [];
  return fixture.materials;
}

export async function listStoredProductImpacts(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<ProductImpactRecord[]> {
  if (!isPilotOrg(slug)) return [];
  const { data: products } = await client
    .from("products")
    .select("id, style_code, sku")
    .eq("organization_id", organizationId)
    .eq("lifecycle", "active");
  const records: ProductImpactRecord[] = [];
  for (const product of products || []) {
    const impact = await resolveStoredProductImpact(client, organizationId, slug, product);
    if (impact) records.push(impact);
  }
  return records;
}

export function providerCredentialsConfigured(
  connections: SustainabilityProviderConnection[],
  providerId: SustainabilityProviderId
): boolean {
  return connections.find((c) => c.providerId === providerId)?.credentialsConfigured ?? false;
}

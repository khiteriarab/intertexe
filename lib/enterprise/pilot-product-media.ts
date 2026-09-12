import livePilotProducts from "./fixtures/intertexe-live-10-products.json";
import { pilotImageMaps, resolvePilotProductImage, type PilotImageMaps } from "./consumer-signals";

export type PilotFixtureRow = {
  style: string;
  sku: string;
  name: string;
  gtin?: string;
  category?: string;
  composition?: string;
  brand?: string;
  image_url?: string | null;
  country_of_origin?: string | null;
};

const rows = livePilotProducts as PilotFixtureRow[];
const images = pilotImageMaps(rows);

export function pilotCatalog(): PilotFixtureRow[] {
  return rows;
}

export function pilotImageMapsForCatalog(): PilotImageMaps {
  return images;
}

export function resolvePilotFixture(
  sku: string | null | undefined,
  styleCode: string | null | undefined
): PilotFixtureRow | null {
  return (
    rows.find((r) => sku && r.sku === sku) ||
    rows.find((r) => styleCode && r.style === styleCode) ||
    null
  );
}

export function pilotProductImage(
  sku: string | null | undefined,
  styleCode: string | null | undefined
): string | null {
  return resolvePilotProductImage(sku, styleCode, images);
}

export function isPilotStyle(styleCode: string | null | undefined): boolean {
  return String(styleCode || "").startsWith("ITX-LIVE-");
}

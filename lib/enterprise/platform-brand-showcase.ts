import liveProducts from "./fixtures/intertexe-live-10-products.json";

export type ShowcaseProductTile = {
  kind: "product";
  id: string;
  brand: string;
  name: string;
  imageUrl: string;
  composition?: string;
};

export type ShowcaseBrandTile = {
  kind: "brand";
  id: string;
  brand: string;
};

export type ShowcaseTile = ShowcaseProductTile | ShowcaseBrandTile;

type PilotRow = {
  style: string;
  sku: string;
  name: string;
  brand?: string;
  image_url?: string | null;
  composition?: string;
};

/** Curated Customer Zero / Mytheresa pilot products for the platform hero mosaic. */
const SHOWCASE_STYLES = [
  "ITX-LIVE-07",
  "ITX-LIVE-01",
  "ITX-LIVE-09",
  "ITX-LIVE-05",
  "ITX-LIVE-06",
  "ITX-LIVE-08",
  "ITX-LIVE-10",
  "ITX-LIVE-02",
] as const;

/** Three clothing records shown on /platform/demo — selected from the editor-pick 10. */
export const PLATFORM_FEATURED_EXAMPLE_STYLES = ["ITX-LIVE-07", "ITX-LIVE-01", "ITX-LIVE-09"] as const;

function productTiles(): ShowcaseProductTile[] {
  const rows = liveProducts as PilotRow[];
  return SHOWCASE_STYLES.map((style) => {
    const row = rows.find((r) => r.style === style);
    if (!row?.image_url || !row.brand) return null;
    return {
      kind: "product" as const,
      id: style,
      brand: row.brand,
      name: row.name,
      imageUrl: row.image_url,
      composition: row.composition,
    };
  }).filter(Boolean) as ShowcaseProductTile[];
}

function brandTile(brand: string, id: string): ShowcaseBrandTile {
  return { kind: "brand", id, brand };
}

function interleaveTiles(products: ShowcaseProductTile[]): ShowcaseTile[] {
  const tiles: ShowcaseTile[] = [];
  products.forEach((product, index) => {
    tiles.push(brandTile(product.brand, `brand-${product.id}`));
    tiles.push(product);
    if (index % 2 === 1) {
      tiles.push(brandTile(product.brand.split(" ").slice(-2).join(" ") || product.brand, `brand-alt-${product.id}`));
    }
  });
  return tiles;
}

const products = productTiles();
const mosaic = interleaveTiles(products);
const half = Math.ceil(mosaic.length / 2);

export const PLATFORM_SHOWCASE_ROW_A = mosaic.slice(0, half);
export const PLATFORM_SHOWCASE_ROW_B = [...mosaic.slice(half), ...mosaic.slice(0, 2)];

export const PLATFORM_SHOWCASE_STATS = [
  {
    figure: "70%",
    qualifier: "faster",
    label: "Product data to governed record",
  },
  {
    figure: "95%",
    qualifier: "ready",
    label: "For Digital Product Passports",
  },
  {
    figure: "50%",
    qualifier: "fewer",
    label: "Unresolved data gaps",
  },
  {
    figure: "3×",
    qualifier: "faster",
    label: "Resale activation",
  },
] as const;

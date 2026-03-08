import type { Metadata } from "next";
import {
  fetchDesigners,
  fetchDesignerBySlug,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchProductCount,
  fetchProductCountsByBrand,
} from "../lib/supabase-server";
import { getCuratedScore } from "../lib/curated-quality-scores";
import { HomePageContent } from "./components/HomeClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "INTERTEXE — The Material Standard",
  description:
    "Shop fashion by fabric, not just style. 17,000+ clothing items ranked by material quality. Filter polyester out and find natural fibers instantly across 60+ curated brands.",
  alternates: { canonical: "https://www.intertexe.com" },
};

const CURATED_BRAND_SLUGS = [
  "khaite", "anine-bing", "toteme", "frame", "diesel",
  "nanushka", "acne-studios", "the-row", "sandro", "agolde",
];

export default async function HomePage() {
  let designers: any[] = [];
  let productCount = 0;
  let cashmereProducts: any[] = [];
  let silkProducts: any[] = [];
  let linenProducts: any[] = [];
  let productCountByBrand: Record<string, number> = {};
  let curatedDesigners: any[] = [];
  let newInProducts: any[] = [];

  try {
    const results = await Promise.all([
      fetchDesigners(undefined, 100),
      fetchProductCount(),
      fetchProductsByFiber("cashmere").then((p) => p.slice(0, 16)),
      fetchProductsByFiber("silk").then((p) => p.slice(0, 16)),
      fetchProductsByFiber("linen").then((p) => p.slice(0, 16)),
      fetchProductCountsByBrand(CURATED_BRAND_SLUGS),
    ]);

    designers = results[0];
    productCount = results[1];
    cashmereProducts = results[2];
    silkProducts = results[3];
    linenProducts = results[4];
    productCountByBrand = results[5];

    const curatedDesignerResults = await Promise.all(
      CURATED_BRAND_SLUGS.map(async (slug) => {
        const designer = await fetchDesignerBySlug(slug);
        if (!designer) return null;
        if (designer.naturalFiberPercent != null) return designer;
        const score = getCuratedScore(designer.name);
        return score != null ? { ...designer, naturalFiberPercent: score } : designer;
      })
    );
    curatedDesigners = curatedDesignerResults.filter(Boolean);

    const [alcProducts, dieselProducts] = await Promise.all([
      fetchProductsByBrandWithImages("a-l-c-", 24),
      fetchProductsByBrandWithImages("diesel", 24),
    ]);

    const seenIds = new Set<string>();
    for (const p of [...alcProducts, ...dieselProducts]) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        newInProducts.push(p);
      }
    }
    newInProducts = newInProducts.slice(0, 30);
  } catch (e) {
    console.error("Homepage data fetch error:", e);
  }

  return (
    <HomePageContent
      initialData={{
        designers,
        productCount,
        cashmereProducts,
        silkProducts,
        linenProducts,
        productCountByBrand,
        curatedDesigners,
        newInProducts,
      }}
    />
  );
}

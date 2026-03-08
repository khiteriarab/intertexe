import type { Metadata } from "next";
import { getHomePageData } from "../lib/homepage-data";
import { HomePageContent } from "./components/HomeClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "INTERTEXE — The Material Standard",
  description:
    "Shop fashion by fabric, not just style. 17,000+ clothing items ranked by material quality. Filter polyester out and find natural fibers instantly across 60+ curated brands.",
  alternates: { canonical: "https://www.intertexe.com" },
};

export default async function HomePage() {
  let data;
  try {
    data = await getHomePageData();
  } catch (e) {
    console.error("Homepage data fetch error:", e);
    data = {
      designers: [],
      productCount: 0,
      cashmereProducts: [],
      silkProducts: [],
      linenProducts: [],
      productCountByBrand: {},
      curatedDesigners: [],
      newInProducts: [],
    };
  }

  return <HomePageContent initialData={data} />;
}

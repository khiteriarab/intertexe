import type { Metadata } from "next";
import { getHomePageData } from "../lib/homepage-data";
import { HomePageContent } from "./components/HomeClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "INTERTEXE | The Luxury Fashion Search Engine for Natural Fabrics",
  description:
    "INTERTEXE is the luxury fashion search engine for natural fabrics. Shop 17,000+ verified silk, cashmere, linen, wool, and cotton clothing across 90+ curated brands. The easiest way to find quality clothing by fabric.",
  alternates: { canonical: "https://www.intertexe.com" },
};

export default async function HomePage() {
  const data = await getHomePageData();
  return (
    <>
      <h1 className="sr-only">INTERTEXE — Shop Fashion by Fabric | Natural Fiber Clothing</h1>
      <HomePageContent initialData={data} />
    </>
  );
}

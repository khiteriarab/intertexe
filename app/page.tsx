import type { Metadata } from "next";
import { getHomePageData } from "../lib/homepage-data";
import { HomePageContent } from "./components/HomeClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "INTERTEXE — Shop Fashion by Fabric | Natural Fiber Clothing",
  description:
    "INTERTEXE is the easiest way to shop luxury fashion by fabric. Browse 17,000+ clothing items ranked by material quality — filter by silk, cashmere, linen, wool, and cotton across 60+ curated brands.",
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

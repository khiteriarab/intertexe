import type { Metadata } from "next";
import HomeWrapper from "./components/HomeWrapper";

export const metadata: Metadata = {
  title: "INTERTEXE — The Material Standard",
  description:
    "Shop fashion by fabric, not just style. 17,000+ clothing items ranked by material quality. Filter polyester out and find natural fibers instantly across 60+ curated brands.",
  alternates: { canonical: "https://www.intertexe.com" },
};

export default function HomePage() {
  return <HomeWrapper />;
}

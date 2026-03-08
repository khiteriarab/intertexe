import type { Metadata } from "next";
import ShopWrapper from "./ShopWrapper";

export const metadata: Metadata = {
  title: "Shop Verified Products — Search by Fabric",
  description: "Search any clothing item and filter by fabric. 17,000+ products verified for natural fiber quality — silk, linen, cotton, wool, cashmere across 11,000+ brands.",
  alternates: { canonical: "https://www.intertexe.com/shop" },
};

export default function ShopPage() {
  return <ShopWrapper />;
}

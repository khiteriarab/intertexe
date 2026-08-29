import type { Metadata } from "next";
import { CategoryMenuClient } from "../../components/CategoryMenuClient";
import { fetchTaxonomyMenu } from "../../../lib/catalog-taxonomy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Natural Leather & Suede Shoes",
  description: "Shop verified natural leather and suede footwear — browse by category.",
  alternates: { canonical: "https://www.intertexe.com/shop/shoes" },
};

/** Shoes category menu — product grids live at /shop/shoes/[slug]. */
export default async function ShoesCategoryMenuPage() {
  const rows = await fetchTaxonomyMenu({ department: "shoes", region: "us", activeOnly: true });

  return (
    <CategoryMenuClient
      title="Shoes"
      sectionLabel="Shoes"
      subtitle="Natural leather, suede, and nubuck footwear."
      rows={rows}
    />
  );
}

import type { Metadata } from "next";
import { CategoryMenuClient } from "../../components/CategoryMenuClient";
import { fetchTaxonomyMenu } from "../../../lib/catalog-taxonomy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Clothing",
  description: "Browse dresses, tops, shirts, trousers, knitwear, coats, and more.",
  alternates: { canonical: "https://www.intertexe.com/shop/clothing" },
};

export default async function ClothingCategoryMenuPage() {
  const rows = await fetchTaxonomyMenu({ department: "clothing", region: "us", activeOnly: true });

  return (
    <CategoryMenuClient
      title="Clothing"
      sectionLabel="Clothing"
      subtitle="Natural-fiber women's apparel — browse by category."
      rows={rows}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchTaxonomyNodes,
  queryTaxonomyBrowse,
  resolveTaxonomyBrowseNode,
  slugFromPath,
} from "../../../../lib/catalog-taxonomy";
import { TaxonomyCatalogClient } from "../../../components/TaxonomyCatalogClient";
import { mapProductRow } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const taxonomySlug = slugFromPath("shoes", slug);
  const nodes = await fetchTaxonomyNodes({ department: "shoes" });
  const node = resolveTaxonomyBrowseNode(nodes, taxonomySlug);
  if (!node) return { title: "Shoes" };
  return {
    title: `${node.label} | Natural Footwear`,
    alternates: { canonical: `https://www.intertexe.com/shop/shoes/${slug}` },
  };
}

export default async function ShoesTaxonomyGridPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const taxonomySlug = slugFromPath("shoes", slug);
  const nodes = await fetchTaxonomyNodes({ department: "shoes" });
  const node = resolveTaxonomyBrowseNode(nodes, taxonomySlug);
  if (!node) notFound();

  const browse = await queryTaxonomyBrowse({
    taxonomySlug,
    region: "us",
    limit: 24,
    offset: 0,
  });

  const products = browse.products.map((row) => mapProductRow(row));

  return (
    <TaxonomyCatalogClient
      department="shoes"
      taxonomySlug={taxonomySlug}
      categoryLabel={node.label}
      initialProducts={products}
      initialTotal={browse.total}
      initialHasMore={browse.hasMore}
      totalStatus={browse.totalStatus}
    />
  );
}

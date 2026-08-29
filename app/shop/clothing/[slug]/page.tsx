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
import { filterConsumerCatalogProducts } from "../../../../lib/catalog-consumer-guard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const taxonomySlug = slugFromPath("clothing", slug);
  const nodes = await fetchTaxonomyNodes({ department: "clothing" });
  const node = resolveTaxonomyBrowseNode(nodes, taxonomySlug);
  if (!node) return { title: "Clothing" };
  return {
    title: `${node.label} | Shop Clothing`,
    alternates: { canonical: `https://www.intertexe.com/shop/clothing/${slug}` },
  };
}

export default async function ClothingTaxonomyGridPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const taxonomySlug = slugFromPath("clothing", slug);
  const nodes = await fetchTaxonomyNodes({ department: "clothing" });
  const node = resolveTaxonomyBrowseNode(nodes, taxonomySlug);
  if (!node) notFound();

  const browse = await queryTaxonomyBrowse({
    taxonomySlug,
    region: "us",
    limit: 24,
    offset: 0,
    fiber: sp.fiber,
    color: sp.color,
    brand: sp.brand,
    sort: sp.sort,
  });

  const products = filterConsumerCatalogProducts(
    browse.products.map((row) => mapProductRow(row))
  );
  const initialTotal = !browse.hasMore
    ? products.length
    : browse.total > products.length && browse.total < products.length * 50
      ? browse.total
      : products.length;

  return (
    <TaxonomyCatalogClient
      department="clothing"
      taxonomySlug={taxonomySlug}
      categoryLabel={node.label}
      initialProducts={products}
      initialTotal={initialTotal}
      initialHasMore={browse.hasMore}
      totalStatus={browse.totalStatus}
    />
  );
}

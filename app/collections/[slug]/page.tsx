import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionConfig } from "../../../lib/collection-pages";
import { fetchCollectionPageData } from "../../../lib/supabase-server";
import CollectionClient from "./CollectionClient";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getCollectionConfig(slug);
  if (!config) return { title: "Collection | INTERTEXE" };
  return {
    title: `${config.title} | INTERTEXE Collections`,
    description: config.description,
    alternates: { canonical: `https://www.intertexe.com/collections/${slug}` },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const config = getCollectionConfig(slug);
  if (!config) notFound();

  const data = await fetchCollectionPageData(slug, { limit: 56 });
  if (!data) notFound();

  return (
    <CollectionClient
      config={config}
      products={data.products}
      editCount={data.editCount}
      catalogTotal={data.catalogTotal}
      heroImageUrl={data.heroImageUrl}
    />
  );
}

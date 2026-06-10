import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionConfig } from "../../../lib/collection-pages";
import { fetchCollectionPageData } from "../../../lib/supabase-server";
import CollectionClient from "./CollectionClient";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getCollectionConfig(slug);
  if (!config) return { title: "Collection | INTERTEXE" };
  const canonical = `https://www.intertexe.com/collections/${slug}`;
  return {
    title: `${config.title} Natural Fiber Edit`,
    description: `Shop the ${config.title} edit. ${config.description} Verified natural fiber pieces from luxury brands.`,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        "en-US": canonical,
        "en-GB": canonical,
        "en-AU": canonical,
        es: canonical,
        "es-ES": canonical,
        fr: canonical,
        de: canonical,
        it: canonical,
        "x-default": canonical,
      },
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const config = getCollectionConfig(slug);
  if (!config) notFound();

  const data = await fetchCollectionPageData(slug, { limit: 48, skipTotal: false });
  if (!data) notFound();

  return (
    <CollectionClient
      config={config}
      products={data.products}
      editCount={data.editCount}
      catalogTotal={data.catalogTotal ?? data.editCount}
      initialHasMore={data.hasMore}
      heroImageUrl={data.heroImageUrl}
    />
  );
}

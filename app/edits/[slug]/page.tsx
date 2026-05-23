import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getEditConfig } from "../../../lib/edit-pages";
import { fetchEditPageData } from "../../../lib/supabase-server";
import EditClient from "./EditClient";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getEditConfig(slug);
  if (!config) return { title: "Edit | INTERTEXE" };
  const path = config.canonicalPath || `/edits/${slug}`;
  return {
    title: `${config.title} | INTERTEXE`,
    description: config.description,
    alternates: { canonical: `https://www.intertexe.com${path}` },
  };
}

export default async function EditPage({ params }: Props) {
  const { slug } = await params;
  const config = getEditConfig(slug);
  if (!config) notFound();
  if (config.canonicalPath && config.canonicalPath !== `/edits/${slug}`) {
    redirect(config.canonicalPath);
  }

  const data = await fetchEditPageData(slug, { limit: 56 });
  if (!data) notFound();

  return (
    <EditClient
      config={config}
      products={data.products}
      editCount={data.editCount}
      catalogTotal={data.catalogTotal}
      heroImageUrl={data.heroImageUrl}
    />
  );
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { getKhiterisEditConfig, KHITERIS_EDIT_JULY_2026 } from "../../lib/khiteris-edit";
import { catalogRegionFromCountry, getCountryFromHeaders } from "../../lib/geo-detect";
import { resolveKhiterisEditForRegion } from "../../lib/khiteri-regional-links";
import { KhiterisEditView } from "./KhiterisEditView";

const APP_STORE_URL = "https://apps.apple.com/app/id6770476520";
const CANONICAL = "https://www.intertexe.com/khiteri";

const baseEdit = getKhiterisEditConfig();

const seoDescription =
  baseEdit.subtitle ??
  "A curated monthly edit of natural-fiber fashion — linen, silk, and cotton selections from INTERTEXE.";

const coverAbsolute = baseEdit.coverImage.src.startsWith("http")
  ? baseEdit.coverImage.src
  : `https://www.intertexe.com${baseEdit.coverImage.src}`;

export const metadata: Metadata = {
  title: `${baseEdit.title} — ${baseEdit.monthLabel} | INTERTEXE`,
  description: seoDescription,
  keywords: [
    "Khiteri edit",
    "INTERTEXE",
    "natural fiber fashion",
    "linen dress",
    "silk maxi dress",
    "Dissh",
    "The Attico",
    "airport pants",
    "editorial fashion edit",
    "sustainable style",
  ],
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "INTERTEXE",
    title: `${baseEdit.title} — ${baseEdit.monthLabel}`,
    description: seoDescription,
    url: CANONICAL,
    images: [{ url: coverAbsolute, alt: baseEdit.coverImage.alt }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${baseEdit.title} — ${baseEdit.monthLabel}`,
    description: seoDescription,
    images: [coverAbsolute],
  },
};

export default async function KhiteriPage(props: { searchParams?: Promise<{ preview?: string }> }) {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || APP_STORE_URL;
  const country = getCountryFromHeaders(await headers());
  const catalogRegion = catalogRegionFromCountry(country);
  const params = (await props.searchParams) || {};
  const sourceEdit = params.preview === "2026-07" ? KHITERIS_EDIT_JULY_2026 : baseEdit;
  // Regional catalog lookup is soft-budgeted so the page never waits on a slow Supabase round-trip.
  const edit = await resolveKhiterisEditForRegion(sourceEdit, catalogRegion);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${edit.title} — ${edit.monthLabel}`,
    description: edit.subtitle ?? seoDescription,
    url: CANONICAL,
    isPartOf: {
      "@type": "WebSite",
      name: "INTERTEXE",
      url: "https://www.intertexe.com",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: edit.coverImage.src.startsWith("http")
        ? edit.coverImage.src
        : `https://www.intertexe.com${edit.coverImage.src}`,
    },
    mainEntity: {
      "@type": "ItemList",
      name: edit.title,
      numberOfItems: edit.products.length,
      itemListElement: edit.products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          brand: { "@type": "Brand", name: product.brand },
          image: product.image.src.startsWith("http")
            ? product.image.src
            : `https://www.intertexe.com${product.image.src}`,
          description: product.composition,
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: product.price.replace(/[^0-9.]/g, ""),
            url: product.href,
            availability: "https://schema.org/InStock",
          },
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <link rel="preload" as="image" href={edit.coverImage.src} />
      <KhiterisEditView edit={edit} appStoreUrl={appStoreUrl} catalogRegion={catalogRegion} />
    </>
  );
}

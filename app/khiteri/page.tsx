import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  affiliateOnlyKhiterisEdit,
  getKhiterisEditConfig,
  KHITERIS_EDIT_AUGUST_2026,
  KHITERIS_EDIT_JULY_2026,
  type KhiterisEditConfig,
} from "../../lib/khiteris-edit";
import { catalogRegionFromCountry, getCountryFromHeaders } from "../../lib/geo-detect";
import { resolveKhiterisEditForRegion } from "../../lib/khiteri-regional-links";
import { getAppStoreUrl } from "../../lib/app-store";
import { KhiterisEditView } from "./KhiterisEditView";

const CANONICAL = "https://www.intertexe.com/khiteri";

const baseEdit = getKhiterisEditConfig();

const seoDescription =
  baseEdit.subtitle ??
  "A curated monthly edit of natural-fiber fashion — cashmere, wool, silk, and leather for fall.";

function khiterisEditForPreview(preview?: string): KhiterisEditConfig {
  switch (preview) {
    case "2026-07":
      return KHITERIS_EDIT_JULY_2026;
    case "2026-08":
      return KHITERIS_EDIT_AUGUST_2026;
    default:
      return baseEdit;
  }
}

const coverAbsolute = baseEdit.coverImage.src.startsWith("http")
  ? baseEdit.coverImage.src
  : `https://www.intertexe.com${baseEdit.coverImage.src}`;

export const metadata: Metadata = {
  title: `${baseEdit.title} — ${baseEdit.monthLabel} | INTERTEXE`,
  description: seoDescription,
  keywords: [
    "Khiteri edit",
    "INTERTEXE",
    "fall edit",
    "September fall edit",
    "cashmere knit",
    "wool blazer",
    "leather coat",
    "natural fiber fashion",
    "editorial fashion edit",
  ],
  alternates: { canonical: CANONICAL },
  // Private editorial link: accessible directly, but not discoverable in search.
  robots: { index: false, follow: false },
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
  const appStoreUrl = getAppStoreUrl();
  const country = getCountryFromHeaders(await headers());
  const catalogRegion = catalogRegionFromCountry(country);
  const params = (await props.searchParams) || {};
  const sourceEdit = affiliateOnlyKhiterisEdit(khiterisEditForPreview(params.preview));
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

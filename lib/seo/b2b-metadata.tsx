import type { Metadata } from "next";
import { SITE_URL, OG_IMAGE, OPEN_GRAPH_LOCALES, GLOBAL_ROBOTS } from "../seo-international";

/** Absolute canonical for a public path (www.intertexe.com). */
export function absoluteUrl(path = "/"): string {
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

type B2bMetaInput = {
  /** Absolute title (no template suffix). */
  title: string;
  description: string;
  path: string;
  ogImageAlt?: string;
};

/** Unique B2B page metadata with OG + Twitter + canonical. */
export function b2bPageMetadata({ title, description, path, ogImageAlt }: B2bMetaInput): Metadata {
  const url = absoluteUrl(path);
  const image = {
    ...OG_IMAGE,
    alt: ogImageAlt || "INTERTEXE — fashion material intelligence and Digital Product Passports",
  };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: GLOBAL_ROBOTS,
    openGraph: {
      title,
      description,
      url,
      siteName: "INTERTEXE",
      locale: "en_US",
      alternateLocale: [...OPEN_GRAPH_LOCALES],
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      site: "@shopintertexe",
      title,
      description,
      images: [image.url],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "INTERTEXE",
    alternateName: ["intertexe", "Intertexe"],
    url: SITE_URL,
    logo: `${SITE_URL}/app-icon.png`,
    description:
      "INTERTEXE provides fashion material intelligence and Digital Product Passport software for brands and retailers.",
    sameAs: [
      "https://twitter.com/shopintertexe",
      "https://www.instagram.com/intertexe",
      "https://www.linkedin.com/company/intertexe",
    ],
    knowsAbout: [
      "Digital Product Passport",
      "fashion Digital Product Passport",
      "fashion material intelligence",
      "fashion product data platform",
      "fashion traceability software",
      "natural fiber fashion",
    ],
  };
}

export function softwareApplicationJsonLd(opts?: { url?: string; name?: string; description?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts?.name || "INTERTEXE",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: opts?.url || absoluteUrl("/brands"),
    description:
      opts?.description ||
      "Fashion material intelligence and Digital Product Passport platform for apparel brands.",
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqPageJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

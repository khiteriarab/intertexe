import type { Metadata } from "next";
import "./globals.css";
import { ClientApp } from "./components/ClientApp";
import { CookieConsent } from "./components/CookieConsent";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GENERIC_SITE_DESCRIPTION } from "../lib/catalog-stats-labels";
import { CATALOG_STATS } from "../lib/catalog-stats";
import {
  GLOBAL_ROBOTS,
  OG_IMAGE,
  OPEN_GRAPH_LOCALES,
  SITE_URL,
  pageAlternates,
} from "../lib/seo-international";

const HOME_DESCRIPTION =
  `Discover ${CATALOG_STATS.productCountFormatted} verified natural fiber pieces across ${CATALOG_STATS.brandCountFormatted} brands. Shop silk, cashmere, linen, wool and cotton clothing. Scan any label to find better natural fiber alternatives at your price point.`;

const OG_DESCRIPTION =
  `Shop ${CATALOG_STATS.productCountFormatted} verified natural fiber pieces. Silk, cashmere, linen, wool and cotton from Zimmermann, Isabel Marant, Toteme and ${CATALOG_STATS.brandCountFormatted} brands.`;

export const metadata: Metadata = {
  title: {
    default: "INTERTEXE | Natural Fiber Fashion Discovery",
    template: "%s | INTERTEXE",
  },
  description: HOME_DESCRIPTION,
  keywords: [
    "INTERTEXE",
    "intertexe",
    "natural fiber fashion",
    "shop by fabric",
    "silk clothing",
    "cashmere clothing",
    "linen clothing",
    "wool clothing",
    "cotton clothing",
    "luxury fashion",
    "natural fabric clothing",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: pageAlternates(),
  robots: GLOBAL_ROBOTS,
  openGraph: {
    title: "INTERTEXE | Natural Fiber Fashion Discovery",
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "INTERTEXE",
    locale: "en_US",
    alternateLocale: [...OPEN_GRAPH_LOCALES],
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shopintertexe",
    title: "INTERTEXE | Natural Fiber Fashion Discovery",
    description:
      `Shop ${CATALOG_STATS.productCountFormatted} verified natural fiber pieces. Scan any label to find better natural fiber alternatives at your price point.`,
    images: [OG_IMAGE.url],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
  },
  other: {
    "theme-color": "#FAFAF8",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "INTERTEXE",
  alternateName: ["intertexe", "Intertexe", "INTERTEXE.COM"],
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: GENERIC_SITE_DESCRIPTION,
  foundingDate: "2025",
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressCountry: "US",
    },
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@intertexe.com",
    contactType: "customer service",
  },
  sameAs: [
    "https://twitter.com/shopintertexe",
    "https://www.instagram.com/intertexe",
    "https://www.linkedin.com/company/intertexe",
  ],
  knowsAbout: [
    "natural fiber fashion",
    "silk clothing",
    "cashmere clothing",
    "linen clothing",
    "wool clothing",
    "cotton clothing",
    "luxury fashion",
    "sustainable fashion",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "INTERTEXE",
  alternateName: "Intertexe",
  url: SITE_URL,
  description:
    "Fashion discovery platform for natural fiber clothing. Shop verified silk, cashmere, linen, wool and cotton pieces.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  sameAs: [
    "https://www.instagram.com/intertexe",
    "https://www.linkedin.com/company/intertexe",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `nextjs-portal,next-devtools,next-badge-root{display:none!important}` }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var r=0;window.addEventListener("error",function(e){if(e&&e.message&&e.message.indexOf("Loading chunk")!==-1&&r<3){r++;setTimeout(function(){window.location.reload()},1500)}},true);window.addEventListener("unhandledrejection",function(e){if(e&&e.reason&&e.reason.message&&e.reason.message.indexOf("Loading chunk")!==-1&&r<3){r++;setTimeout(function(){window.location.reload()},1500)}},true)})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="w-full min-h-screen overflow-x-hidden" suppressHydrationWarning>
        <ClientApp>
          {children}
        </ClientApp>
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

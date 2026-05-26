import type { Metadata } from "next";
import "./globals.css";
import { ClientApp } from "./components/ClientApp";
import { CookieConsent } from "./components/CookieConsent";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GENERIC_SITE_DESCRIPTION } from "../lib/catalog-stats-labels";

export const metadata: Metadata = {
  title: {
    default: "INTERTEXE | Shop Luxury Fashion by Fabric — Natural Fiber Clothing",
    template: "%s | INTERTEXE",
  },
  description: GENERIC_SITE_DESCRIPTION,
  keywords: ["INTERTEXE", "intertexe", "natural fiber fashion", "shop by fabric", "silk clothing", "cashmere clothing", "linen clothing", "wool clothing", "cotton clothing", "luxury fashion", "natural fabric clothing"],
  metadataBase: new URL("https://www.intertexe.com"),
  alternates: { canonical: "https://www.intertexe.com" },
  openGraph: {
    title: "INTERTEXE | Shop Luxury Fashion by Fabric",
    description: GENERIC_SITE_DESCRIPTION,
    url: "https://www.intertexe.com",
    siteName: "INTERTEXE",
    type: "website",
    images: ["/opengraph.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shopintertexe",
    title: "INTERTEXE | Shop Luxury Fashion by Fabric",
    description: GENERIC_SITE_DESCRIPTION,
    images: ["/opengraph.jpg"],
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
  url: "https://www.intertexe.com",
  logo: "https://www.intertexe.com/favicon.svg",
  description: GENERIC_SITE_DESCRIPTION,
  sameAs: ["https://twitter.com/shopintertexe"],
  foundingDate: "2025",
  knowsAbout: ["natural fiber fashion", "silk clothing", "cashmere clothing", "linen clothing", "wool clothing", "cotton clothing", "luxury fashion", "sustainable fashion"],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "INTERTEXE",
  url: "https://www.intertexe.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate:
        "https://www.intertexe.com/shop?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
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

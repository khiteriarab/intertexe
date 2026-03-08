import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";

export const metadata: Metadata = {
  title: {
    default: "INTERTEXE — The Material Standard",
    template: "%s | INTERTEXE",
  },
  description:
    "Shop fashion by fabric, not just style. 17,000+ clothing items ranked by material quality. Filter polyester out and find natural fibers instantly across 60+ curated brands.",
  metadataBase: new URL("https://www.intertexe.com"),
  openGraph: {
    title: "INTERTEXE",
    description:
      "Shop fashion by fabric, not just style. 17,000+ items ranked by material quality. Filter polyester out. Find natural fibers instantly.",
    url: "https://www.intertexe.com",
    siteName: "INTERTEXE",
    type: "website",
    images: ["/opengraph.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shopintertexe",
    title: "INTERTEXE",
    description:
      "Shop fashion by fabric, not just style. 17,000+ items ranked by material quality. Filter polyester out. Find natural fibers instantly.",
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
  url: "https://www.intertexe.com",
  logo: "https://www.intertexe.com/favicon.svg",
  description:
    "Shop fashion by fabric, not just style. 17,000+ clothing items ranked by material quality. Filter polyester out and find natural fibers instantly across 60+ curated brands.",
  sameAs: ["https://twitter.com/shopintertexe"],
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
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EVKFJLK9BP"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EVKFJLK9BP');
          `}
        </Script>
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
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-20 md:pb-0">
              {children}
            </main>
            <Footer />
            <ScrollToTop />
          </div>
        </Providers>
      </body>
    </html>
  );
}

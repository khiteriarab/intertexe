import type { Metadata } from "next";
import "./globals.css";
import { ClientApp } from "./components/ClientApp";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function isHydErr(s){if(!s)return false;if(typeof s==='object'&&s.message)s=s.message;if(typeof s!=='string')return false;return s.indexOf('Hydration')!==-1||s.indexOf('hydrat')!==-1||s.indexOf('#418')!==-1||s.indexOf('#423')!==-1||s.indexOf('did not match')!==-1||s.indexOf('server rendered')!==-1||s.indexOf('Text content does not match')!==-1}if(typeof window.reportError==='function'){var origRE=window.reportError;window.reportError=function(e){if(isHydErr(e))return;origRE.call(window,e)}}var oe=window.onerror;window.onerror=function(m){if(isHydErr(m))return true;if(oe)return oe.apply(this,arguments)};var ce=console.error;console.error=function(){if(isHydErr(arguments[0]))return;ce.apply(console,arguments)};window.addEventListener('error',function(e){if(e&&isHydErr(e.message)){e.stopImmediatePropagation();e.preventDefault()}},true);window.addEventListener('unhandledrejection',function(e){if(e&&e.reason&&isHydErr(e.reason)){e.stopImmediatePropagation();e.preventDefault()}},true);new MutationObserver(function(ml){for(var i=0;i<ml.length;i++){for(var j=0;j<ml[i].addedNodes.length;j++){var n=ml[i].addedNodes[j];if(n&&n.tagName){var t=n.tagName.toLowerCase();if(t==='nextjs-portal'||t==='next-dev-overlay'){n.remove()}}}}}).observe(document.documentElement,{childList:true,subtree:true})})();`,
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
      <body suppressHydrationWarning>
        <ClientApp>
          {children}
        </ClientApp>
      </body>
    </html>
  );
}

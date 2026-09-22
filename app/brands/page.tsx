import type { Metadata } from "next";
import { PlatformChrome } from "../platform/PlatformChrome";
import { PlatformHome } from "../platform/PlatformHome";
import { PlatformViewTracker } from "../platform/PlatformViewTracker";
import { b2bPageMetadata, JsonLd, softwareApplicationJsonLd, absoluteUrl } from "../../lib/seo/b2b-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = b2bPageMetadata({
  title: "Material Intelligence Platform for Fashion | INTERTEXE",
  description:
    "Normalize product data, resolve material issues, benchmark catalogs and publish Digital Product Passports from one governed fashion data platform.",
  path: "/brands",
  ogImageAlt: "INTERTEXE material intelligence platform for fashion brands",
});

export default function BrandsMarketingHomePage() {
  return (
    <PlatformChrome active="platform">
      <JsonLd
        data={softwareApplicationJsonLd({
          url: absoluteUrl("/brands"),
          description:
            "Fashion material intelligence and Digital Product Passport platform for apparel brands.",
        })}
      />
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}

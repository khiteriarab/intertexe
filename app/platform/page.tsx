import type { Metadata } from "next";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformHome } from "./PlatformHome";
import { PlatformViewTracker } from "./PlatformViewTracker";
import { b2bPageMetadata, JsonLd, softwareApplicationJsonLd, absoluteUrl } from "../../lib/seo/b2b-metadata";

export const dynamic = "force-static";

/** Legacy /platform alias — same content as /brands; canonical stays on /brands. */
export const metadata: Metadata = {
  ...b2bPageMetadata({
    title: "Material Intelligence Platform for Fashion | INTERTEXE",
    description:
      "Normalize product data, resolve material issues, benchmark catalogs and publish Digital Product Passports from one governed fashion data platform.",
    path: "/brands",
  }),
  robots: { index: false, follow: true },
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <JsonLd
        data={softwareApplicationJsonLd({
          url: absoluteUrl("/brands"),
        })}
      />
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}

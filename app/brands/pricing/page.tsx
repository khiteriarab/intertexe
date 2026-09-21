import type { Metadata } from "next";
import { b2bPageMetadata } from "../../../lib/seo/b2b-metadata";

export { default } from "../../platform/pricing/page";
export const dynamic = "force-dynamic";

export const metadata: Metadata = b2bPageMetadata({
  title: "INTERTEXE Pricing | Fashion Material Intelligence & DPP",
  description:
    "Explore INTERTEXE pricing for material intelligence, product data governance, benchmarking and Digital Product Passport management.",
  path: "/brands/pricing",
});

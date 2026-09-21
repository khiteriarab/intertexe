import type { Metadata } from "next";
import { b2bPageMetadata } from "../../../lib/seo/b2b-metadata";

export { default } from "../../platform/solutions/page";

export const metadata: Metadata = b2bPageMetadata({
  title: "Fashion Solutions | Product Record & Digital Product Passports",
  description:
    "INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer transparency, and Digital Product Passports through one governed product record.",
  path: "/brands/solutions",
});

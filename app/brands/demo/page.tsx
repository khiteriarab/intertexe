import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/demo/page";

export const metadata: Metadata = {
  title: "See INTERTEXE live",
  description:
    "From a tag to full transparency — see how INTERTEXE turns product data into a verified digital passport with the Silk Midi Skirt sample record.",
  alternates: { canonical: marketingCanonical("demo") },
};

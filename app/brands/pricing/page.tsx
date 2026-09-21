import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/pricing/page";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — build your yearly licence",
  description:
    "Select the INTERTEXE modules you need. Priced modules show annual starting figures; lifecycle scope is set in your written proposal.",
  alternates: { canonical: marketingCanonical("pricing") },
};

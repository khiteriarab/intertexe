import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/demo/page";

export const metadata: Metadata = {
  title: "See INTERTEXE live",
  description:
    "From material to next life — follow product data through INTERTEXE from sourcing to Digital Product Passports, then into use, repair and recirculation.",
  alternates: { canonical: marketingCanonical("demo") },
};

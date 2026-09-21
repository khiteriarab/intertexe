import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/success-stories/page";

export const metadata: Metadata = {
  title: "Success Stories — INTERTEXE for brands",
  description:
    "See how brands and partners use INTERTEXE to govern product data, prove claims, and publish Digital Product Passports.",
  alternates: { canonical: marketingCanonical("success-stories") },
};

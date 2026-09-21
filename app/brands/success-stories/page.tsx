import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/success-stories/page";

export const metadata: Metadata = {
  title: "Success Stories — INTERTEXE for brands",
  description:
    "INTERTEXE case studies are coming Fall 2026. Interested in being featured? Start a free demo.",
  alternates: { canonical: marketingCanonical("success-stories") },
};

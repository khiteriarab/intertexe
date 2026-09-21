import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/pricing/page";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Foundation, Intelligence, Enterprise",
  description:
    "Monthly USD plans for INTERTEXE product intelligence: Foundation, Intelligence, and Enterprise. Clear commitments, implementation fees, and EUR estimates for reference.",
  alternates: { canonical: marketingCanonical("pricing") },
};

import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/solutions/page";

export const metadata: Metadata = {
  title: "Solutions — one product record, six ways to use it",
  description:
    "INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer transparency, and next-life experiences through one governed product record.",
  alternates: { canonical: marketingCanonical("solutions") },
};

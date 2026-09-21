import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";

export { default } from "../../platform/request/page";

export const metadata: Metadata = {
  title: "Request a demo",
  description:
    "Request a demo of INTERTEXE — start with products implemented free, or explore Professional, Platform, and Enterprise after qualification.",
  alternates: { canonical: marketingCanonical("request") },
};

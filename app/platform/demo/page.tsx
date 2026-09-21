import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import "./demo-tour.css";

export const metadata: Metadata = {
  title: "See INTERTEXE live",
  description:
    "From a tag to full transparency — see how INTERTEXE turns product data into a verified digital passport with the Silk Midi Skirt sample record.",
  alternates: { canonical: marketingCanonical("demo") },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformDemoClient />
    </PlatformChrome>
  );
}

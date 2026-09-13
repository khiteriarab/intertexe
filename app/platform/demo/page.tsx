import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import { PlatformDemoShell } from "./PlatformDemoShell";
import "./demo-tour.css";

export const metadata: Metadata = {
  title: "See INTERTEXE live",
  description:
    "A premium guided tour: follow the Silk Midi Skirt from source data to governed record, Digital Product Passport, benchmark intelligence, and next-life readiness. Then explore the 10-product sample catalog.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformDemoShell>
        <PlatformDemoClient />
      </PlatformDemoShell>
    </PlatformChrome>
  );
}

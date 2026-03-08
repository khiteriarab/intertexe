import type { Metadata } from "next";
import ScannerClient from "./ScannerClient";

export const metadata: Metadata = {
  title: "Shopping Intelligence Scanner | INTERTEXE",
  description: "AI-powered fabric analysis tool. Paste any product URL or upload a clothing tag photo to instantly analyze composition, quality, and sustainability. Get smarter shopping recommendations.",
  alternates: { canonical: "https://www.intertexe.com/scanner" },
};

export default function ScannerPage() {
  return <ScannerClient />;
}

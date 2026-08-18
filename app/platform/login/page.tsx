import type { Metadata } from "next";
import Link from "next/link";
import { PlatformChrome } from "../PlatformChrome";

export const metadata: Metadata = {
  title: "Platform login",
  description: "Partner and operator access to INTERTEXE Material Intelligence.",
};

export default function PlatformLoginPage() {
  return (
    <PlatformChrome active="login">
      <div className="max-w-sm mx-auto px-6 py-28 text-center">
        <p className="text-[11px] tracking-[0.25em] text-[#9c7b8b] mb-6">PLATFORM ACCESS</p>
        <h1 className="text-2xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Partner & operator access
        </h1>
        <p className="text-sm text-[#5c5854] leading-relaxed mb-10">
          API partners receive keys after a Material Data Snapshot or Catalog Enrichment Pilot. INTERTEXE
          operators sign in to the private dashboard.
        </p>
        <Link
          href="/platform/demo#snapshot"
          className="block text-[11px] tracking-[0.2em] uppercase bg-black text-white px-10 py-4 mb-4 hover:bg-[#2a2a2a]"
        >
          Request access
        </Link>
        <Link
          href="/dashboard/login"
          className="block text-[11px] tracking-[0.2em] uppercase border border-[#ddd5cb] px-10 py-4 mb-8 hover:border-black"
        >
          Dashboard sign-in
        </Link>
        <Link href="/platform" className="text-xs text-[#8a847c] underline underline-offset-4">
          Back to platform overview
        </Link>
      </div>
    </PlatformChrome>
  );
}

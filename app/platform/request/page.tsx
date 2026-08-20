import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformLeadForm } from "../PlatformLeadForm";
import { PlatformViewTracker } from "../PlatformViewTracker";

export const metadata: Metadata = {
  title: "See INTERTEXE with your own products",
  description: "Request a free 10-product Material Snapshot or the $5,000 Founding Pilot.",
};

export default async function PlatformRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; cta?: string }>;
}) {
  const params = await searchParams;
  const intent = params.intent || "snapshot";
  const source = params.cta || `request_${intent}`;
  const startedEvent =
    intent === "founding_pilot"
      ? "platform_pilot_started"
      : intent === "api_access"
        ? "platform_api_access_started"
        : "platform_snapshot_started";
  return (
    <PlatformChrome active="request">
      <PlatformViewTracker event={startedEvent} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
        <p className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.25em] text-[#9c7b8b] mb-6">INTERTEXE PLATFORM</p>
        <h1 className="text-[2rem] sm:text-4xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
          {intent === "founding_pilot"
            ? "Request the Founding Pilot"
            : intent === "api_access"
              ? "Talk to us about your catalog"
              : "See INTERTEXE with your own products"}
        </h1>
        <p className="text-[#5c5854] leading-relaxed mb-10 max-w-xl">
          {intent === "founding_pilot"
            ? "Tell us who you are. The Founding Pilot is $5,000 — 100 complex products or 500 structured rows."
            : intent === "api_access"
              ? "Tell us who you are. Ongoing INTERTEXE Platform starts from $499/month. We will not ask for a confidential catalog on this form."
              : "Send 10 product records. We will show you what INTERTEXE finds, what you are missing, how your material data compares, and what it would take to make those products passport-ready. Free. No commitment. We will not ask for a confidential catalog on this form."}
        </p>
        <PlatformLeadForm intent={intent} sourceCta={source} />
      </div>
    </PlatformChrome>
  );
}

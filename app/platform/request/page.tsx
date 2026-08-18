import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformLeadForm } from "../PlatformLeadForm";
import { PlatformViewTracker } from "../PlatformViewTracker";

export const metadata: Metadata = {
  title: "Request a Material Data Snapshot",
  description: "Request a free 10-product Material Data Snapshot or the $5,000 Founding Material Data Pilot.",
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
        <p className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.25em] text-[#9c7b8b] mb-6">MATERIAL INTELLIGENCE API</p>
        <h1 className="text-[2rem] sm:text-4xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Request a 10-product snapshot
        </h1>
        <p className="text-[#5c5854] leading-relaxed mb-10 max-w-xl">
          Tell us who you are. We will not ask for a confidential catalog on this form.
        </p>
        <PlatformLeadForm intent={intent} sourceCta={source} />
      </div>
    </PlatformChrome>
  );
}

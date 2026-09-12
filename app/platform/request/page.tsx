import type { Metadata } from "next";
import { PLATFORM_MONTHLY_USD, PROFESSIONAL_MONTHLY_USD, FOUNDING_PILOT_PRICE_USD, saasTierByKey } from "../../../lib/enterprise/pricing";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformLeadForm } from "../PlatformLeadForm";
import { PlatformViewTracker } from "../PlatformViewTracker";

export const metadata: Metadata = {
  title: "See INTERTEXE with your own products",
  description: `Free snapshot, $${FOUNDING_PILOT_PRICE_USD.toLocaleString("en-US")} Founding Pilot, or SaaS from $${PLATFORM_MONTHLY_USD}/month.`,
};

export default async function PlatformRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; cta?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const intent = params.intent || "snapshot";
  const tier = params.tier;
  const source = params.cta || `request_${intent}`;
  const startedEvent =
    intent === "founding_pilot"
      ? "platform_pilot_started"
      : intent === "enterprise" || intent === "saas" || intent === "api_access"
        ? "platform_api_access_started"
        : "platform_snapshot_started";

  let headline = "See INTERTEXE with your own products";
  let body =
    "Send 10 product records. We will show you what INTERTEXE finds, what you are missing, how your material data compares, and what it would take to make those products passport-ready. Free. No commitment.";

  if (intent === "founding_pilot") {
    headline = "Request the Founding Pilot";
    body = `The Founding Pilot is $${FOUNDING_PILOT_PRICE_USD.toLocaleString("en-US")} — implementation and onboarding, not a monthly subscription. 100 complex products or 500 structured rows.`;
  } else if (intent === "enterprise") {
    headline = "Talk to us about Enterprise";
    body =
      "Headless passport API, SSO, custom domains, PLM/PIM/ERP integrations, high-volume hosting, NFC/RFID, and SLAs. Custom pricing.";
  } else if (intent === "saas" && tier && (tier === "platform" || tier === "professional")) {
    const def = saasTierByKey(tier);
    headline = `Request ${def.name}`;
    body = `${def.priceLabel} — ${def.headline} Includes ${def.productAllowance?.toLocaleString("en-US") ?? "custom"} managed products and ${def.passportAllowance?.toLocaleString("en-US") ?? "custom"} active passports.`;
  } else if (intent === "saas" || intent === "api_access") {
    headline = "Choose your operating plan";
    body = `Platform ($${PLATFORM_MONTHLY_USD}/mo) for core OS · Professional ($${PROFESSIONAL_MONTHLY_USD.toLocaleString("en-US")}/mo) for white-label passports · Enterprise for headless API. We will recommend volume limits for your catalog.`;
  }

  return (
    <PlatformChrome active="request">
      <PlatformViewTracker event={startedEvent} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
        <div className="itx-editorial-panel itx-editorial-panel-inner p-8 sm:p-10 md:p-12">
          <p className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.25em] text-[#9c7b8b] mb-6">
            INTERTEXE PLATFORM
          </p>
          <h1 className="text-[2rem] sm:text-4xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
            {headline}
          </h1>
          <p className="text-[#5c5854] leading-relaxed mb-10 max-w-xl">{body}</p>
          <PlatformLeadForm intent={intent} sourceCta={source} tier={tier} />
        </div>
      </div>
    </PlatformChrome>
  );
}

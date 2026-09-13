import type { Metadata } from "next";
import { PILOT_PRODUCT_LIMIT, saasTierByKey } from "../../../lib/enterprise/pricing";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformLeadForm } from "../PlatformLeadForm";
import { PlatformViewTracker } from "../PlatformViewTracker";

export const metadata: Metadata = {
  title: "See INTERTEXE with your own products",
  description: `Start with ${PILOT_PRODUCT_LIMIT} products implemented free. Request access to Professional, Platform, or Enterprise after qualification.`,
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
  let body = `Send up to ${PILOT_PRODUCT_LIMIT} product records. INTERTEXE implements them at no charge so you can evaluate passports, material intelligence, and traceability on your actual catalog. No commitment.`;

  if (intent === "founding_pilot") {
    headline = "Request access";
    body =
      "Implementation is a one-time onboarding fee attached at checkout — not a subscription tier. Share your catalog profile and we will qualify your brand and share commercial terms.";
  } else if (intent === "enterprise") {
    headline = "Talk to us about Enterprise";
    body =
      "Custom product volume, headless passport API, SSO, custom domains, PLM/PIM/ERP integrations, multi-brand deployments, and SLAs.";
  } else if (intent === "saas" && tier && (tier === "platform" || tier === "professional" || tier === "enterprise")) {
    const def = saasTierByKey(tier as "platform" | "professional" | "enterprise");
    headline = `Request ${def.name}`;
    body = `${def.headline} Pricing is shared after qualification — ${def.publicPriceLabel.toLowerCase()}.`;
  } else if (intent === "saas" || intent === "api_access") {
    headline = "Choose your operating plan";
    body =
      "Professional for standard DPP infrastructure · Platform for white-label, circularity, and advanced analytics · Enterprise for custom volume and headless API. Pricing is shared after qualification.";
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

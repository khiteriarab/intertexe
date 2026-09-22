import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";
import Link from "next/link";
import { PILOT_PRODUCT_LIMIT, saasTierByKey } from "../../../lib/enterprise/pricing";
import {
  estimateModules,
  formatEur,
  leadModulesSummary,
  parseModuleKeysParam,
  pricingModuleByKey,
} from "../../../lib/enterprise/pricing-modules";
import { PLATFORM_LIVE_CATALOG } from "../../../lib/enterprise/platform-showcase";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformLeadForm } from "../PlatformLeadForm";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { SERIF } from "../platform-ui";

export const metadata: Metadata = {
  title: "Request a demo",
  alternates: { canonical: marketingCanonical("request") },
  description: `Request a demo of INTERTEXE — start with ${PILOT_PRODUCT_LIMIT} products implemented free, or explore Professional, Platform, and Enterprise after qualification.`,
};

function requestCopy(intent: string, tier?: string, modulesSummary?: string | null) {
  if (modulesSummary) {
    return {
      eyebrow: "Your selection",
      headline: "Request a proposal for your modules",
      body: "We received the modules you selected on pricing. Share your catalog profile and the INTERTEXE team will reply with a written proposal — usually within one business day.",
    };
  }
  if (intent === "founding_pilot") {
    return {
      eyebrow: "Request access",
      headline: "Implementation & onboarding",
      body: "Implementation is a one-time onboarding fee attached at checkout — not a subscription tier. Share your catalog profile and we will qualify your brand and share commercial terms.",
    };
  }
  if (intent === "enterprise") {
    return {
      eyebrow: "Enterprise",
      headline: "Talk to us about Enterprise",
      body: "Custom product volume, headless passport API, SSO, custom domains, PLM/PIM/ERP integrations, multi-brand deployments, and SLAs.",
    };
  }
  if (intent === "saas" && tier && (tier === "platform" || tier === "professional" || tier === "enterprise")) {
    const def = saasTierByKey(tier as "platform" | "professional" | "enterprise");
    return {
      eyebrow: def.name,
      headline: `Request ${def.name}`,
      body: `${def.headline} Pricing is shared after qualification — ${def.publicPriceLabel.toLowerCase()}.`,
    };
  }
  if (intent === "saas" || intent === "api_access") {
    return {
      eyebrow: "Operating plans",
      headline: "Choose your operating plan",
      body: "Professional for standard DPP infrastructure · Platform for white-label, circularity, and advanced analytics · Enterprise for custom volume and headless API. Pricing is shared after qualification.",
    };
  }
  return {
    eyebrow: "Request a demo",
    headline: "Let\u2019s govern your product data.",
    body: "Prepare for Digital Product Passport requirements and put product transparency at the heart of your growth — from material origin to consumer scan, care, resale, and next life.",
  };
}

export default async function PlatformRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; cta?: string; tier?: string; modules?: string }>;
}) {
  const params = await searchParams;
  const intent = params.intent || "snapshot";
  const tier = params.tier;
  const moduleKeys = parseModuleKeysParam(params.modules);
  const modulesSummary = leadModulesSummary(moduleKeys);
  const estimate = estimateModules(moduleKeys);
  const source = params.cta || `request_${intent}`;
  const startedEvent =
    intent === "founding_pilot"
      ? "platform_pilot_started"
      : intent === "enterprise" || intent === "saas" || intent === "api_access"
        ? "platform_api_access_started"
        : "platform_snapshot_started";

  const copy = requestCopy(intent, tier, modulesSummary);

  return (
    <PlatformChrome active="request">
      <PlatformViewTracker event={startedEvent} />
      <section className="platform-request-page">
        <div className="platform-request-page-inner">
          <div className="platform-request-copy">
            <p className="platform-request-eyebrow">{copy.eyebrow}</p>
            <h1 className="platform-request-headline" style={SERIF}>
              {copy.headline}
            </h1>
            <p className="platform-request-body">{copy.body}</p>

            {moduleKeys.length ? (
              <div className="platform-request-modules">
                <p className="platform-request-modules-kicker">Selected modules</p>
                <ul className="platform-request-points">
                  {moduleKeys.map((key) => {
                    const mod = pricingModuleByKey(key);
                    if (!mod) return null;
                    return (
                      <li key={key}>
                        {mod.name}
                        {mod.startingEur != null
                          ? ` — from ${formatEur(mod.startingEur)} / year`
                          : " — scoped in your proposal"}
                      </li>
                    );
                  })}
                </ul>
                {estimate.totalEur > 0 ? (
                  <p className="platform-request-stat" style={SERIF}>
                    From {formatEur(estimate.totalEur)} / year
                    {estimate.requiresProposal ? " + custom scope" : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {intent === "snapshot" && !moduleKeys.length ? (
              <>
                <p className="platform-request-stat" style={SERIF}>
                  {PLATFORM_LIVE_CATALOG.productCount} live pilot products already governed in INTERTEXE.
                </p>
                <p className="platform-request-sub">
                  Join the brands building one record from fragmented product data to compliance-ready passports,
                  consumer transparency, and circular next life.
                </p>
                <ul className="platform-request-points">
                  <li>Start with {PILOT_PRODUCT_LIMIT} products — implemented free after qualification</li>
                  <li>Professional · Platform · Enterprise — pricing shared during onboarding</li>
                  <li>From disconnected files to one governed product record</li>
                </ul>
              </>
            ) : null}

            <Link href="/brands/demo" className="platform-request-demo-link">
              Prefer to explore first? See it live →
            </Link>
          </div>

          <div className="platform-request-form-panel">
            <div className="platform-request-form-card">
              <p className="platform-request-form-kicker">Get started</p>
              <h2 className="platform-request-form-title" style={SERIF}>
                See INTERTEXE with your own products.
              </h2>
              <p className="platform-request-form-intro">
                Tell us about your brand and catalog. The INTERTEXE team will review your profile and reply with next
                steps — usually within one business day.
              </p>
              <PlatformLeadForm
                intent={intent}
                sourceCta={source}
                tier={tier}
                modules={moduleKeys}
                variant="request"
              />
            </div>
          </div>
        </div>
      </section>
    </PlatformChrome>
  );
}

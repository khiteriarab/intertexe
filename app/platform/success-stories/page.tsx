import type { Metadata } from "next";
import Link from "next/link";
import { marketingCanonical, marketingPath } from "../../../lib/enterprise-marketing/paths";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { SERIF } from "../platform-ui";
import "./success-stories.css";

export const metadata: Metadata = {
  title: "Success Stories — INTERTEXE for brands",
  description:
    "INTERTEXE case studies are coming Winter 2026. Interested in being featured? Start a free demo.",
  alternates: { canonical: marketingCanonical("success-stories") },
};

export default function SuccessStoriesPage() {
  return (
    <PlatformChrome active="success-stories">
      <PlatformViewTracker event="platform_success_stories_view" />
      <div className="ss-page">
        <section className="ss-coming">
          <div className="platform-lux-wrap">
            <div className="ss-coming-panel">
              <p className="ss-coming-eyebrow">Success stories</p>
              <h1 className="ss-coming-title" style={SERIF}>
                Case studies coming <em>Winter 2026</em>
              </h1>
              <p className="ss-coming-lede">
                We&apos;re documenting how brands and partners use INTERTEXE to govern product data, prove claims,
                and publish Digital Product Passports. Stories publish this fall.
              </p>
              <p className="ss-coming-invite">
                Interested in being a case study? Start a free demo — we&apos;ll build from there.
              </p>
              <div className="ss-coming-actions">
                <Link
                  href={marketingPath("request?intent=snapshot&cta=success_stories_coming")}
                  className="ss-coming-primary"
                >
                  Start a free demo
                  <span aria-hidden>→</span>
                </Link>
                <Link href={marketingPath("demo")} className="ss-coming-secondary">
                  See it live
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PlatformChrome>
  );
}

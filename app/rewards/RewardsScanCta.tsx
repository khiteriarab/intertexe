"use client";

import { ArrowRight } from "lucide-react";
import { AppStoreCtaLink } from "../components/AppStoreCtaLink";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";

export function RewardsScanCta() {
  const chromeHref = getChromeWebStoreUrl();

  return (
    <section className="bg-[#F4F4ED] py-16 px-6 md:px-16">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-[9px] tracking-[0.4em] uppercase text-[#AAAAAA] mb-4">Start earning</p>
        <h2 className="text-3xl font-serif font-light text-[#1C2B2A] mb-4">
          Download the app. Start scanning.
        </h2>
        <p className="text-[13px] font-light text-[#1C2B2A] leading-relaxed mb-8">
          Scan care labels in stores or while you browse to earn points and unlock Fiber, Silk, and
          Cashmere tiers — the more you discover, the more exclusive your access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <AppStoreCtaLink
            cta="rewards_download_app"
            testId="link-rewards-download-app"
            className="inline-flex items-center justify-center gap-2 text-[9px] tracking-[0.35em] uppercase bg-[#1C2B2A] text-white px-10 py-4 hover:bg-[#2A3B3A] transition-colors"
          >
            Download the app <ArrowRight className="w-3.5 h-3.5" />
          </AppStoreCtaLink>
          <a
            href={chromeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-[9px] tracking-[0.35em] uppercase border border-[#1C2B2A] text-[#1C2B2A] px-10 py-4 hover:bg-[#1C2B2A] hover:text-white transition-colors"
            data-testid="link-rewards-add-chrome"
          >
            Add to Chrome <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

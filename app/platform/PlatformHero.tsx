"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SERIF } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

const INSIGHTS = [
  {
    id: "resolve",
    pill: "Resolving composition…",
    brand: "Supplier feed · ERP · PLM",
    name: "Wide-leg linen trouser",
    detail: "98% Cotton / 2% Elastane vs 100% Cotton — conflict flagged",
    tone: "amber" as const,
  },
  {
    id: "benchmark",
    pill: "Benchmarking material mix…",
    brand: "Peer segment · Ready-to-wear",
    name: "Silk-blend midi dress",
    detail: "Natural fiber share +11% vs governed peer median",
    tone: "teal" as const,
  },
  {
    id: "passport",
    pill: "Passport ready",
    brand: "Digital Product Passport",
    name: "Cashmere crew knit",
    detail: "QR linked · 12 required fields complete",
    tone: "green" as const,
  },
  {
    id: "publish",
    pill: "Publishing to channels…",
    brand: "Ecommerce · QR · Brand site",
    name: "Wool tailored blazer",
    detail: "One governed record → passport, PDP, and compliance fields",
    tone: "slate" as const,
  },
] as const;

const PILL_TONE: Record<(typeof INSIGHTS)[number]["tone"], string> = {
  amber: "bg-[#f5efe6] text-[#7a5c2e] border-[#e8dcc8]",
  teal: "bg-[#e8f0ef] text-[#2c4a3e] border-[#cdded9]",
  green: "bg-[#eaf2ea] text-[#2d5a34] border-[#cfe0cf]",
  slate: "bg-[#eef0f4] text-[#152238] border-[#d5dee8]",
};

const TRUST_MARKS = [
  "Digital Product Passport",
  "EU Textile Strategy",
  "AGEC compliance",
  "Material transparency",
] as const;

export function PlatformHero() {
  const [index, setIndex] = useState(0);
  const signIn = getEnterpriseLoginUrl();
  const insight = INSIGHTS[index]!;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % INSIGHTS.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#faf9f7] text-[#161513]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-14 sm:pt-20 md:pt-24 text-center">
        <p className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#9c9488] mb-6">
          INTERTEXE FOR BRANDS
        </p>
        <h1
          className="text-[2.35rem] sm:text-[3.25rem] md:text-[3.75rem] font-light leading-[1.06] tracking-[-0.02em] text-[#161513] max-w-4xl mx-auto mb-5"
          style={SERIF}
        >
          Trace, measure and{" "}
          <em className="not-italic italic text-[#3e6268]">govern</em> your product data.
        </h1>
        <p className="mx-auto max-w-xl text-[16px] sm:text-[17px] font-light leading-relaxed text-[#6f6a63] mb-8">
          The product and material data layer for fashion — connect fragmented sources, benchmark against peers, and
          publish passports from one record.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <Link
            href="/platform/request?intent=snapshot&cta=hero"
            className="inline-flex items-center justify-center rounded-full bg-[#152238] text-white px-8 py-3.5 text-[11px] tracking-[0.16em] uppercase min-h-[44px] hover:bg-[#0f1a2c] transition-colors"
          >
            Request a demo
          </Link>
          <Link
            href={signIn}
            className="inline-flex items-center justify-center rounded-full border border-[#161513]/20 text-[#161513] px-8 py-3.5 text-[11px] tracking-[0.16em] uppercase min-h-[44px] hover:bg-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-6 sm:pb-10 pt-10 sm:pt-14">
        <div className="relative mx-auto max-w-[980px]">
          <img
            src="/platform/hero-workspace-desktop.png"
            alt="INTERTEXE enterprise workspace — illustrative sample catalog"
            width={1920}
            height={1080}
            className="w-full rounded-2xl border border-[#e8e3da]/80 shadow-[0_40px_100px_rgba(22,21,19,0.08)]"
          />

          <div
            key={insight.id}
            className="platform-hero-card absolute left-1/2 top-[38%] sm:top-[42%] z-20 w-[min(92%,340px)] -translate-x-1/2"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-2xl border border-[#e8e3da] bg-white/95 backdrop-blur-md shadow-[0_24px_60px_rgba(22,21,19,0.14)] px-4 py-3.5 sm:px-5 sm:py-4 text-left">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0ebe4] text-[10px] font-medium text-[#152238]">
                  TX
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-[0.08em] uppercase mb-2 ${PILL_TONE[insight.tone]}`}
                  >
                    {insight.pill}
                  </p>
                  <p className="text-[9px] tracking-[0.14em] uppercase text-[#9c9488] mb-0.5">{insight.brand}</p>
                  <p className="text-sm font-medium text-[#161513] truncate">{insight.name}</p>
                  <p className="text-[12px] text-[#6f6a63] leading-snug mt-0.5">{insight.detail}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {INSIGHTS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show insight ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-[#152238]" : "w-1.5 bg-[#152238]/25 hover:bg-[#152238]/45"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#9c9488] leading-relaxed max-w-2xl mx-auto">
          Illustrative workspace · sample catalog, not a live customer. The card cycles through governed-record
          moments — composition resolution, benchmarking, and passport readiness.
        </p>
      </div>

      <div className="border-t border-[#e8e3da]/70 bg-[#161513] py-5 sm:py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12">
            {TRUST_MARKS.map((mark) => (
              <li
                key={mark}
                className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-white/55 whitespace-nowrap"
                style={SERIF}
              >
                {mark}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

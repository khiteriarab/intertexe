"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import { getChromeWebStoreUrl } from "../../../lib/chrome-extension";
import { useInView, useReducedMotion } from "../b2b-motion";
import { SERIF } from "../platform-ui";

const CONSUMER_ACTIONS = [
  { label: "Discover", hint: "Material-first shopping" },
  { label: "Scan", hint: "Label & barcode in store" },
  { label: "Compare", hint: "Better-material matches" },
] as const;

const BRAND_ACTIONS = [
  { label: "Understand", hint: "Material mix & completeness" },
  { label: "Benchmark", hint: "Governed peer comparison" },
  { label: "Prepare", hint: "Issues & readiness" },
  { label: "Publish", hint: "Passport & public identity" },
] as const;

function MiniPhone() {
  return (
    <div className="rounded-[14px] border-[3px] border-[#161513] bg-white w-[72px] h-[120px] overflow-hidden shadow-sm">
      <div className="h-2 bg-white flex justify-center">
        <span className="mt-0.5 w-8 h-0.5 rounded-full bg-[#161513]/70" />
      </div>
      <div className="px-1.5 py-1">
        <p className="text-[6px] tracking-[0.14em] uppercase text-center text-[#152238]">INTERTEXE</p>
        <div className="grid grid-cols-2 gap-0.5 mt-1">
          <div className="aspect-[3/4] bg-[#e8e0d4]" />
          <div className="aspect-[3/4] bg-[#d9cbb8]" />
        </div>
      </div>
    </div>
  );
}

function MiniExtension() {
  return (
    <div className="rounded-md border border-[#e8e3da] bg-[#f7f5f1] w-[88px] p-2 shadow-sm">
      <p className="text-[6px] tracking-[0.12em] uppercase text-[#152238]">Fabric Scanner</p>
      <div className="mt-1 space-y-1">
        <div className="h-1.5 bg-[#152238]/80 rounded-sm w-full" />
        <div className="h-1 bg-[#e8e3da] rounded-sm w-4/5" />
        <div className="h-1 bg-[#e8e3da] rounded-sm w-3/5" />
      </div>
    </div>
  );
}

function PulseBeam({ active, vertical }: { active: boolean; vertical?: boolean }) {
  if (!active) {
    return (
      <div
        className={`bg-[#e8e3da] ${vertical ? "w-px h-10 mx-auto" : "h-px w-full min-w-[32px]"}`}
        aria-hidden
      />
    );
  }
  return (
    <div
      className={`relative overflow-hidden ${vertical ? "w-px h-10 mx-auto" : "h-px flex-1 min-w-[32px]"}`}
      aria-hidden
    >
      <span className={`absolute inset-0 bg-[#3e6268]/30 ${vertical ? "b2b-pulse-vertical" : "b2b-pulse-line"}`} />
    </div>
  );
}

export function FashionEcosystemVisual({ className = "" }: { className?: string }) {
  const [ref, inView] = useInView(0.2);
  const reduced = useReducedMotion();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!inView || reduced) return;
    const tick = () => setPulse((p) => !p);
    tick();
    const id = window.setInterval(tick, 3200);
    return () => window.clearInterval(id);
  }, [inView, reduced]);

  const active = reduced ? true : pulse;

  return (
    <figure ref={ref as RefObject<HTMLElement>} className={`m-0 ${className}`}>
      <div className="rounded-xl border border-[#e8e3da] bg-[#f7f5f1] overflow-hidden shadow-[0_20px_50px_rgba(22,21,19,0.05)]">
        <div className="p-6 sm:p-10">
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-6 items-stretch">
            {/* Consumers */}
            <div className="space-y-4">
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">Consumers</p>
                <p className="text-lg font-light" style={SERIF}>
                  Discover · Scan · Compare
                </p>
              </div>
              <ul className="space-y-2">
                {CONSUMER_ACTIONS.map((action) => (
                  <li
                    key={action.label}
                    className="bg-white border border-[#e8e3da] px-4 py-3 text-sm text-[#5c5854]"
                  >
                    <span className="text-[10px] tracking-[0.12em] uppercase text-[#9c7b8b] block">{action.label}</span>
                    {action.hint}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-3 pt-2">
                <Link
                  href="/shop"
                  className="text-[10px] tracking-[0.1em] uppercase border border-[#e8e3da] bg-white px-3 py-2 hover:border-[#3e6268]/40 min-h-[44px] flex items-center"
                >
                  Shopping platform
                </Link>
                <MiniPhone />
                <MiniExtension />
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center gap-2 px-1 min-w-[48px]" aria-hidden>
              <PulseBeam active={active && inView} />
              <span className="text-[10px] text-[#3e6268] uppercase tracking-[0.08em]">scan</span>
              <PulseBeam active={active && inView} />
            </div>

            {/* INTERTEXE hub */}
            <div className="flex flex-col justify-center">
              <div className="bg-[#152238] text-white p-6 sm:p-8 relative overflow-hidden text-center md:text-left">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.1]"
                  aria-hidden
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-24deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 15px)",
                  }}
                />
                <div className="relative">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">INTERTEXE</p>
                  <p className="text-xl font-light mb-3" style={SERIF}>
                    Product + material intelligence
                  </p>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Composition normalized · governed · benchmarked
                  </p>
                  {active && inView ? (
                    <p className="mt-4 text-[10px] font-mono text-[#9bb4c9] b2b-fade-in" aria-live="polite">
                      100% Linen → readiness updated
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="md:hidden text-center text-[#3e6268] py-2" aria-hidden>
                ↕
              </p>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center gap-2 px-1 min-w-[48px]" aria-hidden>
              <PulseBeam active={active && inView} />
              <span className="text-[10px] text-[#3e6268] uppercase tracking-[0.08em]">govern</span>
              <PulseBeam active={active && inView} />
            </div>

            {/* Brands */}
            <div className="flex flex-col justify-center">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">Brands</p>
              <p className="text-lg font-light mb-4" style={SERIF}>
                Understand · Benchmark · Prepare · Publish
              </p>
              <ul className="space-y-2 mb-4">
                {BRAND_ACTIONS.map((action) => (
                  <li
                    key={action.label}
                    className="text-xs text-[#5c5854] bg-white border border-[#e8e3da] px-4 py-2.5"
                  >
                    <span className="text-[10px] tracking-[0.1em] uppercase text-[#9c7b8b]">{action.label}</span>
                    <span className="block mt-0.5">{action.hint}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-[#8a847c] leading-relaxed border-t border-[#e8e3da] pt-3">
                Future governed consumer signals · aggregate intelligence — developing. Not live individual shopper
                data.
              </p>
            </div>
          </div>

          {/* Mobile vertical */}
          <div className="md:hidden mt-4 space-y-2 text-center text-xs text-[#8a847c]">
            <p>Consumer scan → INTERTEXE → brand readiness</p>
            <a
              href={getChromeWebStoreUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[10px] tracking-[0.1em] uppercase underline underline-offset-2"
            >
              Chrome extension
            </a>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
        Enterprise customers buy the governed data layer. Consumer discovery is INTERTEXE&apos;s strategic surface —
        not the product on the contract.
      </figcaption>
    </figure>
  );
}

/** Back-compat export for sales-sections tests. */
export function ConsumerEcosystemVisual() {
  return <FashionEcosystemVisual className="mt-10 sm:mt-14" />;
}

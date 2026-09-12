"use client";

import { useState } from "react";
import { useReducedMotion } from "../b2b-motion";
import { SERIF } from "../platform-ui";

const SOURCES = [
  {
    id: "plm",
    label: "PLM / PIM",
    raw: "92 SE / 8 EA",
    normalized: "Silk 92% · Elastane 8%",
  },
  {
    id: "erp",
    label: "ERP exports",
    raw: "70 CO / 30 PA",
    normalized: "Cotton 70% · Polyamide 30%",
  },
  {
    id: "sheet",
    label: "Spreadsheets",
    raw: "100% COT",
    normalized: "Cotton 100%",
  },
  {
    id: "supplier",
    label: "Supplier files",
    raw: "WO 85% / NY 15%",
    normalized: "Wool 85% · Nylon 15%",
  },
  {
    id: "feed",
    label: "Product feeds",
    raw: "Linen blend",
    normalized: "Linen 78% · Cotton 22%",
  },
] as const;

const OUTPUTS = [
  "Material analysis",
  "Benchmarking",
  "Issues & readiness",
  "Digital Product Passports",
  "Public product identity",
] as const;

function HorizontalConnector({ active = false }: { active?: boolean }) {
  return (
    <div className="relative hidden lg:flex items-center justify-center px-2 xl:px-4 self-stretch" aria-hidden>
      <div className="h-px w-full min-w-[24px] xl:min-w-[40px] bg-[#e8e3da] overflow-hidden">
        <span
          className={`block h-full w-full bg-[var(--platform-accent)]/70 origin-left ${
            active ? "b2b-pulse-line" : "scale-x-0 opacity-0"
          }`}
        />
      </div>
      <span className={`shrink-0 text-[var(--platform-accent)] mx-2 ${active ? "opacity-100" : "opacity-40"}`}>→</span>
      <div className="h-px w-full min-w-[24px] xl:min-w-[40px] bg-[#e8e3da] overflow-hidden">
        <span
          className={`block h-full w-full bg-[var(--platform-accent)]/70 ${
            active ? "b2b-pulse-line-delay" : "scale-x-0 opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

function VerticalConnector({ active = false }: { active?: boolean }) {
  return (
    <div className="relative flex lg:hidden flex-col items-center py-2" aria-hidden>
      <div className="w-px h-8 bg-[#e8e3da] overflow-hidden">
        <span
          className={`block w-full h-full bg-[var(--platform-accent)]/70 origin-top ${
            active ? "b2b-pulse-vertical" : "scale-y-0 opacity-0"
          }`}
        />
      </div>
      <span className={`shrink-0 text-[var(--platform-accent)] my-1 ${active ? "opacity-100" : "opacity-40"}`}>↓</span>
      <div className="w-px h-8 bg-[#e8e3da] overflow-hidden">
        <span
          className={`block w-full h-full bg-[var(--platform-accent)]/70 origin-top ${
            active ? "b2b-pulse-vertical" : "scale-y-0 opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

export function DataArchitectureVisual({ className = "" }: { className?: string }) {
  const [activeId, setActiveId] = useState<(typeof SOURCES)[number]["id"]>("plm");
  const reduced = useReducedMotion();
  const active = SOURCES.find((s) => s.id === activeId) ?? SOURCES[0];

  return (
    <figure className={`m-0 ${className}`}>
      <div className="rounded-xl border border-[#e8e3da] bg-[#f7f5f1] overflow-hidden shadow-[0_20px_50px_rgba(22,21,19,0.05)]">
        <div className="p-4 sm:p-6 lg:p-5 xl:p-7">
          <div
            className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.85fr)_auto_minmax(0,1fr)_auto_minmax(0,0.9fr)] lg:items-stretch"
            aria-label="Product data architecture: sources normalize into one governed record, then intelligence outputs"
          >
            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-3 lg:mb-3" id="b2b-source-label">
                Source data
              </p>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2"
                role="list"
                aria-labelledby="b2b-source-label"
              >
                {SOURCES.map((source) => {
                  const selected = source.id === activeId;
                  return (
                    <button
                      key={source.id}
                      type="button"
                      role="listitem"
                      onMouseEnter={() => setActiveId(source.id)}
                      onFocus={() => setActiveId(source.id)}
                      onClick={() => setActiveId(source.id)}
                      aria-pressed={selected}
                      className={`w-full text-left px-3 lg:px-3.5 py-2.5 lg:py-2 border transition-colors min-h-[44px] ${
                        selected
                          ? "bg-white border-[var(--platform-accent)]/40 shadow-sm"
                          : "bg-white/60 border-[#e8e3da] hover:border-[var(--platform-accent)]/25"
                      }`}
                    >
                      <p className="text-[9px] lg:text-[10px] tracking-[0.1em] lg:tracking-[0.12em] uppercase text-[#9c7b8b] mb-0.5 lg:mb-1">
                        {source.label}
                      </p>
                      <p className="font-mono text-[10px] lg:text-[11px] text-[#5c5854] truncate lg:whitespace-normal">
                        {source.raw}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <VerticalConnector active={!reduced} />
            <HorizontalConnector active={!reduced} />

            <div className="bg-[var(--platform-primary)] text-white p-4 sm:p-5 lg:p-4 xl:p-5 flex flex-col justify-center relative overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.1]"
                aria-hidden
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-24deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 15px)",
                }}
              />
              <div className="relative">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-1.5 lg:mb-2">INTERTEXE</p>
                <p className="hidden lg:block text-base xl:text-lg font-light mb-2 xl:mb-3" style={SERIF}>
                  Normalize · resolve · govern
                </p>
                <p className="lg:hidden font-mono text-sm text-[var(--platform-accent-muted)]" aria-live="polite">
                  {active.raw} → {active.normalized}
                </p>
                <div className="hidden lg:block rounded border border-white/15 bg-white/5 p-2.5 xl:p-3 text-xs">
                  <p className="text-white/50 mb-1 uppercase tracking-[0.1em] text-[10px]">Incoming</p>
                  <p className="font-mono text-white/90 mb-1.5 text-[11px]">{active.raw}</p>
                  <p className="text-white/40 mb-1">↓</p>
                  <p className="text-white/50 mb-1 uppercase tracking-[0.1em] text-[10px]">Normalized</p>
                  <p className="font-mono text-[var(--platform-accent-muted)] text-[11px]" aria-live="polite">
                    {active.normalized}
                  </p>
                </div>
              </div>
            </div>

            <VerticalConnector active={!reduced} />
            <HorizontalConnector active={!reduced} />

            <div className="bg-white border border-[#e8e3da] p-4 sm:p-5 lg:p-4 xl:p-5 flex flex-col justify-center">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2 lg:mb-2">Governed record</p>
              <p className="text-lg xl:text-xl font-light mb-1 lg:mb-2 text-[#161513]" style={SERIF}>
                One product record
              </p>
              <p className="hidden lg:block text-sm text-[#5c5854] leading-relaxed">
                Accurate. Complete. Traceable. Source values preserved — canonical fields for intelligence.
              </p>
            </div>

            <VerticalConnector active={!reduced} />
            <HorizontalConnector active={!reduced} />

            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-3" id="b2b-output-label">
                Intelligence &amp; outputs
              </p>
              <ul className="space-y-1.5 lg:space-y-2" aria-labelledby="b2b-output-label">
                {OUTPUTS.map((item) => (
                  <li
                    key={item}
                    className="text-xs sm:text-sm text-[#161513] bg-white border border-[#e8e3da] px-3 lg:px-4 py-2 lg:py-2.5 pl-4 lg:pl-5 border-l-[3px] border-l-[var(--platform-accent)]/50"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
        Illustrative — INTERTEXE connects existing systems without replacing them. Tap a source to see normalization.
      </figcaption>
    </figure>
  );
}

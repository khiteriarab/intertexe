"use client";

import { useState } from "react";
import { Body, DiscoverLink, Eyebrow, Heading, SERIF } from "./platform-ui";

const STEPS = [
  {
    id: "ingest",
    n: "01",
    title: "Ingest",
    lead: "Start with the files you already have.",
    copy: "Excel, CSV, PLM/PIM exports, supplier sheets. Brands do not need a clean catalog before INTERTEXE can work.",
    image: "/platform/understand-ingest-laptop.jpg",
    alt: "Laptop showing INTERTEXE ingest: Excel, CSV and PLM files into a sample catalog. Illustrative — not a live customer.",
  },
  {
    id: "structure",
    n: "02",
    title: "Structure",
    lead: "Normalize without overwriting the original.",
    copy: "CO becomes cotton. PA and nylon become the same polyamide. Shell and lining stay separate components. Two sources that disagree stay visible. Original values and provenance remain on the record.",
    image: "/platform/understand-structure-laptop.jpg",
    alt: "Laptop showing INTERTEXE normalizing Dress 8721 while keeping the original source string. Illustrative sample workspace.",
  },
  {
    id: "diagnose",
    n: "03",
    title: "Diagnose",
    lead: "Know exactly what is wrong or missing.",
    copy: "Conflicts, invalid percentage totals, missing identifiers, incomplete supplier data and evidence gaps become an Issues Inbox — not another spreadsheet audit.",
    image: "/platform/understand-diagnose-laptop.jpg",
    alt: "Laptop showing the INTERTEXE Issues inbox for a sample catalog, including Dress 8721. Illustrative counts, not a live customer.",
  },
] as const;

const AUDIT = [
  ["8,420", "products analyzed"],
  ["1,271", "missing required fields"],
  ["384", "conflicting compositions"],
  ["217", "invalid percentage totals"],
  ["94", "missing identifiers"],
  ["736", "require supplier information"],
] as const;

export function UnderstandCatalog() {
  const [activeId, setActiveId] = useState<(typeof STEPS)[number]["id"]>("ingest");
  const current = STEPS.find((step) => step.id === activeId) ?? STEPS[0];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
      <Eyebrow>Understand</Eyebrow>
      <Heading className="mb-3 max-w-3xl">What happens when a brand uploads its catalog.</Heading>
      <Body className="max-w-2xl mb-10">
        Say a fashion company gives us 10,000 products. The information might look like this. Click Ingest, Structure
        or Diagnose — the workspace mockup changes with the step.
      </Body>

      <div className="rounded-2xl border border-[#d5dee8] bg-white px-5 py-8 sm:px-10 sm:py-10 shadow-[0_24px_60px_rgba(21,34,56,0.08)]">
        <div
          role="tablist"
          aria-label="Ingest, structure, diagnose"
          className="flex justify-center gap-2 sm:gap-10 overflow-x-auto mb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {STEPS.map((step) => {
            const selected = step.id === current.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                id={`understand-tab-${step.id}`}
                aria-selected={selected}
                aria-controls="understand-panel"
                onClick={() => setActiveId(step.id)}
                className={`shrink-0 min-h-[44px] px-2 sm:px-3 text-[12px] sm:text-sm tracking-[0.14em] uppercase border-b-2 transition-colors ${
                  selected
                    ? "border-[#152238] text-[#152238]"
                    : "border-transparent text-[#8a847c] hover:text-[#152238]"
                }`}
              >
                {step.n} — {step.title}
              </button>
            );
          })}
        </div>

        <div id="understand-panel" role="tabpanel" aria-labelledby={`understand-tab-${current.id}`}>
          <h3
            key={`lead-${current.id}`}
            className="text-xl sm:text-2xl text-[#152238] mb-3 itx-understand-copy"
            style={SERIF}
          >
            {current.lead}
          </h3>
          <p
            key={`copy-${current.id}`}
            className="text-[15px] text-[#5c5854] font-light italic leading-relaxed max-w-3xl mb-8 itx-understand-copy"
          >
            {current.copy}
          </p>
          <div className="rounded-xl bg-[#d4e0ee] p-3 sm:p-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#e8eef4]">
              {STEPS.map((step) => (
                <img
                  key={step.id}
                  src={step.image}
                  alt={step.id === current.id ? step.alt : ""}
                  width={1600}
                  height={900}
                  className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-500 ease-out ${
                    step.id === current.id
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-4 scale-[0.98] pointer-events-none"
                  }`}
                />
              ))}
            </div>
          </div>
          {current.id === "diagnose" ? (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-px bg-[#e8e3da] border border-[#e8e3da]">
              {AUDIT.map(([n, label]) => (
                <div key={label} className="bg-white p-4">
                  <p className="text-xl font-light tabular-nums text-[#152238]" style={SERIF}>
                    {n}
                  </p>
                  <p className="text-[10px] tracking-[0.08em] uppercase text-[#8a847c] mt-1">{label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-[#161513] mt-8 mb-3 max-w-2xl">
        Missing information remains missing. INTERTEXE does not fabricate product data.
      </p>
      <p className="text-xs text-[#8a847c] mb-8">
        Illustrative example. Counts are not a live customer catalog. Teams click from each issue into the product
        and fix it.
      </p>
      <DiscoverLink href="/platform/discover">Discover</DiscoverLink>
    </section>
  );
}

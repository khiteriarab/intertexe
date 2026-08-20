"use client";

import { useState, type ReactNode } from "react";
import { DEFAULT_APP_STORE_URL } from "../../lib/app-store";
import { SERIF } from "./platform-ui";

const FIBERS = [
  { name: "Cotton", pct: 36, color: "#c5d4c8" },
  { name: "Polyester", pct: 28, color: "#7d9bb8" },
  { name: "Viscose", pct: 13, color: "#9c7b8b" },
  { name: "Wool", pct: 8, color: "#c4a574" },
  { name: "Linen", pct: 6, color: "#b08968" },
  { name: "Silk", pct: 4, color: "#c9b8d4" },
  { name: "Other", pct: 5, color: "#d4cdc4" },
] as const;

function JacketMark() {
  return (
    <svg viewBox="0 0 220 280" className="w-full h-auto" role="img" aria-label="Illustrative garment beside the workspace">
      <rect width="220" height="280" fill="#f7f5f1" />
      <path
        d="M42 78c8-32 28-52 68-52s60 20 68 52l18 10-12 22h-12v128H48V110H36L24 88l18-10z"
        fill="#f4f1ea"
        stroke="#1d4734"
        strokeWidth="1.4"
      />
      <path d="M70 78c6-18 16-28 40-28s34 10 40 28" fill="none" stroke="#1d4734" strokeWidth="1.2" />
      <path d="M110 86v132M86 118h48M86 154h48" fill="none" stroke="#1d4734" strokeWidth="1" opacity="0.45" />
      <circle cx="156" cy="92" r="28" fill="none" stroke="#9c7b8b" strokeWidth="1.6" />
      <circle cx="156" cy="92" r="18" fill="#f7f5f1" stroke="#9c7b8b" strokeWidth="1" />
      <path d="M176 112l16 16" stroke="#9c7b8b" strokeWidth="2" />
    </svg>
  );
}

const PRODUCT_TABS = ["Overview", "Traceability", "Impact"] as const;

function ProductWorkspaceWindow() {
  const [tab, setTab] = useState<(typeof PRODUCT_TABS)[number]>("Overview");
  const [fiber, setFiber] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-[#e8e3da] bg-white overflow-hidden shadow-[0_24px_60px_rgba(22,21,19,0.14)]">
      <div className="flex items-center justify-between gap-3 bg-[#1d4734] text-white px-3 py-2.5">
        <p className="text-[11px] tracking-[0.08em] truncate">Dress 8721 · sample workspace</p>
        <span className="hidden sm:inline text-[10px] tracking-[0.1em] uppercase text-white/60">Consultation</span>
      </div>
      <div className="flex gap-1 px-3 pt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRODUCT_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 text-[10px] tracking-[0.12em] uppercase px-3 py-2 min-h-[36px] ${
              tab === item ? "bg-[#1d4734] text-white" : "text-[#6f6a63] border border-[#e8e3da]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "Overview" ? (
          <>
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-2">Material mix</p>
            <div className="flex h-3 overflow-hidden bg-[#ebe4da] mb-3">
              {FIBERS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setFiber(item.name)}
                  className="h-full p-0 border-0 min-w-0"
                  style={{
                    flex: item.pct,
                    background: item.color,
                    opacity: fiber && fiber !== item.name ? 0.35 : 1,
                  }}
                  aria-label={`${item.name} ${item.pct} percent`}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#5c5854]">
              {FIBERS.map((item) => (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => setFiber(item.name)}
                    className={`flex w-full justify-between gap-2 text-left ${
                      fiber === item.name ? "text-[#1d4734]" : ""
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="tabular-nums">{item.pct}%</span>
                  </button>
                </li>
              ))}
            </ul>
            {fiber ? (
              <p className="text-xs text-[#8a847c] mt-3">
                {fiber} share in this illustrative catalog. Click another fiber to compare.
              </p>
            ) : (
              <p className="text-xs text-[#8a847c] mt-3">Click a fiber to highlight it. Illustrative example.</p>
            )}
          </>
        ) : null}
        {tab === "Traceability" ? (
          <ol className="text-sm text-[#5c5854] space-y-2">
            <li className="border-t border-[#eeeae4] pt-2">Label · 70 CO / 30 PA</li>
            <li className="border-t border-[#eeeae4] pt-2">INTERTEXE · 70% Cotton · 30% Polyamide</li>
            <li className="border-t border-[#eeeae4] pt-2 text-[#8b2e2e]">Supplier file disagrees · 65 / 35</li>
            <li className="border-t border-[#eeeae4] pt-2">Country of origin · missing</li>
          </ol>
        ) : null}
        {tab === "Impact" ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["81%", "Complete records"],
              ["487", "Issues"],
              ["62%", "Passport-ready"],
            ].map(([n, l]) => (
              <div key={l} className="border border-[#e8e3da] p-3">
                <p className="text-lg font-light tabular-nums" style={SERIF}>
                  {n}
                </p>
                <p className="text-[10px] tracking-[0.08em] uppercase text-[#8a847c] mt-1">{l}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HeroProductStage() {
  return (
    <div className="relative mt-12 sm:mt-16">
      <div className="pointer-events-none absolute inset-0 flex justify-center" aria-hidden="true">
        <div className="w-px bg-[#e8e3da]" />
      </div>
      <div className="relative grid md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] gap-6 items-center">
        <div className="relative max-w-[240px] mx-auto md:mx-0">
          <JacketMark />
          <p className="mt-3 text-[10px] tracking-[0.14em] uppercase text-[#8a847c] text-center md:text-left">
            Product + material record
          </p>
        </div>
        <div className="relative">
          <div className="hidden sm:block absolute -right-2 -top-6 w-[58%] rotate-[6deg] opacity-70 -z-0">
            <div className="rounded-lg border border-[#e8e3da] bg-white p-4 shadow-[0_16px_40px_rgba(22,21,19,0.08)]">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-2">Key indicators</p>
              <p className="text-sm mb-1">Traceability 3/5</p>
              <p className="text-sm mb-1">Data completeness 4/5</p>
              <p className="text-sm">Passport-ready 2/5</p>
            </div>
          </div>
          <div className="relative z-10 md:-rotate-2">
            <ProductWorkspaceWindow />
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-[#8a847c]">
        Dual view: the garment and the INTERTEXE workspace on the same record. Illustrative sample — not a live
        customer catalog.
      </p>
    </div>
  );
}

const MATCH_FILTERS = ["Best", "More natural", "Similar style", "Similar price", "100% natural"] as const;

const MATCHES = [
  { brand: "Eileen Fisher", name: "Organic linen trouser", fiber: "100% Linen", filter: "100% natural" },
  { brand: "Reformation", name: "Cotton wide-leg", fiber: "100% Cotton", filter: "100% natural" },
  { brand: "Vince", name: "Silk-blend blouse", fiber: "88% Silk · 12% Elastane", filter: "More natural" },
  { brand: "Arket", name: "Heavy linen shirt", fiber: "100% Linen", filter: "Similar style" },
  { brand: "COS", name: "Cotton barrel jean", fiber: "98% Cotton · 2% Elastane", filter: "Similar price" },
] as const;

export function ChromeExtensionStage() {
  const [filter, setFilter] = useState<(typeof MATCH_FILTERS)[number]>("Best");
  const visible =
    filter === "Best"
      ? MATCHES
      : filter === "100% natural"
        ? MATCHES.filter((item) => item.filter === "100% natural")
        : MATCHES.filter((item) => item.filter === filter || item.filter === "100% natural");

  return (
    <figure className="m-0">
      <div className="relative mx-auto max-w-[920px]">
        <div className="rounded-[18px] bg-[#cfc8bc] p-2 sm:p-3 shadow-[0_30px_70px_rgba(22,21,19,0.12)]">
          <div className="rounded-[12px] bg-[#f7f5f1] overflow-hidden border border-[#e8e3da]">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-[#eeeae4]">
              <span className="flex gap-1" aria-hidden="true">
                <span className="w-2 h-2 rounded-full bg-[#e0d8cc]" />
                <span className="w-2 h-2 rounded-full bg-[#e0d8cc]" />
                <span className="w-2 h-2 rounded-full bg-[#e0d8cc]" />
              </span>
              <span className="flex-1 text-[10px] tracking-[0.08em] text-[#8a847c] bg-[#f7f5f1] px-3 py-1 truncate">
                shop.example / linen-wide-leg-trousers
              </span>
            </div>
            <div className="grid md:grid-cols-[1fr_280px] min-h-[340px]">
              <div className="p-5 sm:p-8">
                <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a847c] mb-2">Product page</p>
                <p className="text-2xl mb-2" style={SERIF}>
                  Mid-waist wide-leg trousers
                </p>
                <p className="text-sm text-[#5c5854] mb-4">Composition listed as 68% cotton / 32% polyester.</p>
                <div className="w-full max-w-[220px] aspect-[3/4] bg-[#e8e0d4] border border-[#e8e3da]" />
              </div>
              <div className="bg-white border-t md:border-t-0 md:border-l border-[#e8e3da] flex flex-col max-h-[420px]">
                <div className="flex items-center justify-between px-3 py-3 border-b border-[#eeeae4]">
                  <span className="text-[11px] tracking-[0.18em] uppercase" style={SERIF}>
                    INTERTEXE
                  </span>
                  <span className="text-[10px] text-[#8a847c]">Fabric Scanner</span>
                </div>
                <div className="flex gap-1 px-2 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {MATCH_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`shrink-0 text-[10px] tracking-[0.06em] px-2.5 py-1.5 rounded-full border min-h-[32px] ${
                        filter === item
                          ? "bg-[#1d4734] text-white border-[#1d4734]"
                          : "border-[#e8e3da] text-[#6f6a63]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p className="px-3 text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-1">
                  Better-material matches
                </p>
                <ul className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {visible.map((item) => (
                    <li key={item.name} className="flex gap-2 border border-[#eeeae4] p-2">
                      <span className="w-10 h-12 bg-[#e8e0d4] shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-[9px] tracking-[0.14em] uppercase text-[#8a847c]">{item.brand}</span>
                        <span className="block text-xs truncate">{item.name}</span>
                        <span className="block text-[11px] text-[#5c5854]">{item.fiber}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="p-3 border-t border-[#eeeae4] space-y-2">
                  <p className="text-[11px] tracking-[0.08em] uppercase bg-[#1d4734] text-white text-center py-2">
                    View {visible.length} better-material matches
                  </p>
                  <p className="text-[11px] text-center text-[#6f6a63] border border-[#e8e3da] py-2">
                    Alert me when found cheaper
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-xs text-[#8a847c] leading-relaxed max-w-3xl">
        INTERTEXE: Fabric Scanner for Chrome. Illustrative shopping page and matches — not a live retailer
        partnership. The extension reads composition while you shop; it is not required to open a Digital Product
        Passport.
      </figcaption>
    </figure>
  );
}

const MATERIALS = [
  { id: "silk", label: "Silk", swatch: "#d8c4b0" },
  { id: "linen", label: "Linen", swatch: "#c4b48c" },
  { id: "cotton", label: "Cotton", swatch: "#d9d2c5" },
  { id: "wool", label: "Wool", swatch: "#b7a48c" },
  { id: "cashmere", label: "Cashmere", swatch: "#cfc3b6" },
] as const;

const PHONE_PRODUCTS: Record<(typeof MATERIALS)[number]["id"], { fiber: string; brand: string; name: string }[]> = {
  silk: [
    { fiber: "100% SILK", brand: "Vince", name: "Bias slip dress" },
    { fiber: "100% SILK", brand: "Nanushka", name: "Washable silk shirt" },
  ],
  linen: [
    { fiber: "100% LINEN", brand: "Dissh", name: "Linen set" },
    { fiber: "100% LINEN", brand: "Arket", name: "Heavy linen shirt" },
  ],
  cotton: [
    { fiber: "100% COTTON", brand: "Free People", name: "Poplin overall" },
    { fiber: "100% COTTON", brand: "AGOLDE", name: "Organic cotton jean" },
  ],
  wool: [
    { fiber: "100% WOOL", brand: "Theory", name: "Tailored trouser" },
    { fiber: "100% WOOL", brand: "COS", name: "Merino crew" },
  ],
  cashmere: [
    { fiber: "100% CASHMERE", brand: "The Row", name: "Cashmere cardigan" },
    { fiber: "100% CASHMERE", brand: "Vince", name: "Essential crew" },
  ],
};

function PhoneShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[32px] border-[6px] border-[#161513] bg-white overflow-hidden shadow-[0_24px_50px_rgba(22,21,19,0.16)] ${className}`}
    >
      <div className="h-5 bg-white flex justify-center">
        <span className="mt-1.5 w-16 h-1.5 rounded-full bg-[#161513]/80" />
      </div>
      {children}
    </div>
  );
}

export function IphoneAppStage() {
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]["id"]>("linen");
  const products = PHONE_PRODUCTS[material];

  return (
    <figure className="m-0">
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        <PhoneShell className="hidden sm:block w-[132px] opacity-90 -rotate-6 mb-8">
          <div className="px-2 pb-3">
            <p className="text-[8px] tracking-[0.14em] uppercase text-[#8a847c] mb-1">Material</p>
            <p className="text-xs mb-2" style={SERIF}>
              Linen
            </p>
            <div className="grid grid-cols-2 gap-1">
              <div className="aspect-[3/4] bg-[#d9c9a6]" />
              <div className="aspect-[3/4] bg-[#cbb892]" />
            </div>
          </div>
        </PhoneShell>
        <PhoneShell className="w-[210px] sm:w-[240px] z-10">
          <div className="bg-[#1d4734] text-white text-[9px] tracking-[0.08em] text-center py-1.5 px-2">
            Linen is the fabric of summer — shop the edit.
          </div>
          <div className="px-3 py-3">
            <p className="text-[10px] tracking-[0.22em] uppercase text-center mb-3">INTERTEXE</p>
            <p className="text-[9px] tracking-[0.16em] uppercase text-[#8a847c] mb-2">Shop by material</p>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {MATERIALS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMaterial(item.id)}
                  className="shrink-0 w-12 text-center"
                >
                  <span
                    className={`mx-auto mb-1 block w-10 h-10 rounded-full border ${
                      material === item.id ? "border-[#1d4734]" : "border-[#e8e3da]"
                    }`}
                    style={{ background: item.swatch }}
                  />
                  <span className="text-[8px] tracking-[0.08em] uppercase text-[#5c5854]">{item.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] tracking-[0.16em] uppercase text-[#8a847c] mt-2 mb-2">Shop by category</p>
            <div className="flex gap-1 mb-3">
              {["Dresses", "Tops", "Knitwear"].map((item) => (
                <span key={item} className="text-[8px] tracking-[0.1em] uppercase border border-[#e8e3da] px-2 py-1">
                  {item}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {products.map((item) => (
                <div key={item.name}>
                  <div className="aspect-[3/4] bg-[#e8e0d4] mb-1.5" />
                  <p className="text-[8px] tracking-[0.12em] uppercase text-[#1d4734]">{item.fiber}</p>
                  <p className="text-[9px] tracking-[0.1em] uppercase text-[#8a847c]">{item.brand}</p>
                  <p className="text-[10px] truncate">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </PhoneShell>
        <PhoneShell className="hidden sm:block w-[132px] opacity-90 rotate-6 mb-4">
          <div className="px-2 pb-3">
            <p className="text-[8px] tracking-[0.14em] uppercase text-[#8a847c] mb-1">Material</p>
            <p className="text-xs mb-2" style={SERIF}>
              Cashmere
            </p>
            <div className="grid grid-cols-2 gap-1">
              <div className="aspect-[3/4] bg-[#d8cdc3]" />
              <div className="aspect-[3/4] bg-[#c4b6aa]" />
            </div>
          </div>
        </PhoneShell>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={DEFAULT_APP_STORE_URL}
          className="inline-flex items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-[#161513] text-white px-7 py-3.5 min-h-[44px]"
        >
          Download on iPhone
        </a>
      </div>
      <figcaption className="mt-4 text-xs text-[#8a847c] leading-relaxed max-w-3xl mx-auto text-center">
        Illustrative INTERTEXE iPhone UI. Tap a material to change the grid. Product names are catalog examples, not
        a paid placement. Consumers do not need this app to open a passport.
      </figcaption>
    </figure>
  );
}

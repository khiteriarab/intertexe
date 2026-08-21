"use client";

import { useState, type ReactNode } from "react";
import { DEFAULT_APP_STORE_URL } from "../../lib/app-store";
import { SERIF } from "./platform-ui";

export function HeroProductStage() {
  return (
    <figure className="relative mt-12 sm:mt-16 m-0">
      <div className="relative mx-auto max-w-6xl min-h-0 sm:min-h-[480px] lg:min-h-[620px] overflow-hidden">
        <svg
          className="pointer-events-none absolute inset-0 hidden lg:block z-30"
          viewBox="0 0 1100 640"
          fill="none"
          aria-hidden="true"
        >
          <path d="M520 28 L210 250" stroke="white" strokeWidth="1" opacity="0.28" />
          <path d="M560 28 L820 160" stroke="white" strokeWidth="1" opacity="0.28" />
        </svg>
        <img
          src="/platform/hero-silk-dress.png"
          alt="Illustrative silk midi dress — sample product record"
          width={1200}
          height={1600}
          className="relative z-10 mx-auto w-[58%] max-w-[280px] sm:max-w-[340px] lg:absolute lg:left-0 lg:bottom-0 lg:mx-0 lg:w-[38%] lg:max-w-[400px] object-contain drop-shadow-[0_30px_60px_rgba(8,16,32,0.45)]"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse 72% 86% at 50% 52%, #000 46%, transparent 78%)",
            maskImage: "radial-gradient(ellipse 72% 86% at 50% 52%, #000 46%, transparent 78%)",
          }}
        />
        <img
          src="/platform/hero-product-window.png"
          alt="Illustrative INTERTEXE product information window for the silk dress"
          width={1600}
          height={1200}
          className="hidden md:block absolute right-[2%] top-0 z-[5] w-[48%] lg:w-[42%] rotate-[6deg] rounded-xl border border-white/20 shadow-[0_24px_60px_rgba(8,16,32,0.4)]"
        />
        <img
          src="/platform/hero-workspace-desktop.png"
          alt="Illustrative INTERTEXE Enterprise workspace — Dress 8721 sample catalog, not a live customer"
          width={1920}
          height={1080}
          className="relative z-20 mt-6 w-full md:absolute md:right-0 md:top-[22%] md:mt-0 md:w-[72%] lg:w-[66%] md:-rotate-2 rounded-xl border border-white/25 shadow-[0_32px_80px_rgba(8,16,32,0.5)]"
        />
      </div>
      <figcaption className="mt-8 text-center text-xs text-white/60 leading-relaxed max-w-2xl mx-auto">
        Dual view: the silk dress and the INTERTEXE desktop workspace on the same record. Illustrative sample — not a
        live customer catalog.
      </figcaption>
    </figure>
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
                          ? "bg-[#152238] text-white border-[#152238]"
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
                  <p className="text-[11px] tracking-[0.08em] uppercase bg-[#152238] text-white text-center py-2">
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
    <figure className="m-0 overflow-x-hidden">
      <div className="flex items-end justify-center gap-3 sm:gap-6 px-2">
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
          <div className="bg-[#152238] text-white text-[9px] tracking-[0.08em] text-center py-1.5 px-2">
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
                      material === item.id ? "border-[#152238]" : "border-[#e8e3da]"
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
                  <p className="text-[8px] tracking-[0.12em] uppercase text-[#152238]">{item.fiber}</p>
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

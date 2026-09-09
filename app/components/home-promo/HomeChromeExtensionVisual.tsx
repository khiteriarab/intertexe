"use client";

import { useState } from "react";
import { Bell, Chrome, Heart, Leaf, ShoppingBag, Sparkles, Tag, X } from "lucide-react";
import { getChromeWebStoreUrl } from "../../../lib/chrome-extension";

const FILTERS = ["Best", "More natural", "Similar style", "Similar price", "100% natural"] as const;
type Filter = (typeof FILTERS)[number];

const MATCHES: Record<
  Filter,
  Array<{ brand: string; name: string; price: string; fiber: string; tone: string }>
> = {
  Best: [
    { brand: "AGOLDE", name: "Low Slung Baggy Jeans", price: "$198", fiber: "100% Organic Cotton", tone: "#3d4a3a" },
    {
      brand: "CITIZENS OF HUMANITY",
      name: "Horseshoe Jeans",
      price: "$238",
      fiber: "100% Regenerative Cotton",
      tone: "#2c3440",
    },
    { brand: "REFORMATION", name: "Cary Wide Leg", price: "$168", fiber: "100% Organic Cotton", tone: "#1a1a1a" },
  ],
  "More natural": [
    {
      brand: "CITIZENS OF HUMANITY",
      name: "Horseshoe Jeans",
      price: "$238",
      fiber: "100% Regenerative Cotton",
      tone: "#2c3440",
    },
    { brand: "REFORMATION", name: "Cary Wide Leg", price: "$168", fiber: "100% Organic Cotton", tone: "#1a1a1a" },
    { brand: "AGOLDE", name: "Low Slung Baggy Jeans", price: "$198", fiber: "100% Organic Cotton", tone: "#3d4a3a" },
  ],
  "Similar style": [
    { brand: "REFORMATION", name: "Cary Wide Leg", price: "$168", fiber: "100% Organic Cotton", tone: "#1a1a1a" },
    { brand: "AGOLDE", name: "Low Slung Baggy Jeans", price: "$198", fiber: "100% Organic Cotton", tone: "#3d4a3a" },
    {
      brand: "CITIZENS OF HUMANITY",
      name: "Horseshoe Jeans",
      price: "$238",
      fiber: "100% Regenerative Cotton",
      tone: "#2c3440",
    },
  ],
  "Similar price": [
    { brand: "AGOLDE", name: "Low Slung Baggy Jeans", price: "$198", fiber: "100% Organic Cotton", tone: "#3d4a3a" },
    { brand: "REFORMATION", name: "Cary Wide Leg", price: "$168", fiber: "100% Organic Cotton", tone: "#1a1a1a" },
    {
      brand: "CITIZENS OF HUMANITY",
      name: "Horseshoe Jeans",
      price: "$238",
      fiber: "100% Regenerative Cotton",
      tone: "#2c3440",
    },
  ],
  "100% natural": [
    { brand: "REFORMATION", name: "Cary Wide Leg", price: "$168", fiber: "100% Organic Cotton", tone: "#1a1a1a" },
    {
      brand: "CITIZENS OF HUMANITY",
      name: "Horseshoe Jeans",
      price: "$238",
      fiber: "100% Regenerative Cotton",
      tone: "#2c3440",
    },
    { brand: "AGOLDE", name: "Low Slung Baggy Jeans", price: "$198", fiber: "100% Organic Cotton", tone: "#3d4a3a" },
  ],
};

function Callout({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Leaf;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-neutral-200 bg-white/95 px-3 py-1.5 text-[10px] text-neutral-700 shadow-sm ${className || ""}`}
    >
      <Icon className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

/** Interactive Chrome extension mock — replaces static promo PNG. */
export function HomeChromeExtensionVisual() {
  const [filter, setFilter] = useState<Filter>("Best");
  const matches = MATCHES[filter];

  return (
    <div
      className="relative w-full h-full min-h-[420px] md:min-h-[520px] flex items-center justify-center p-2 md:p-3"
      data-testid="home-chrome-extension-visual"
    >
      <div className="relative w-full max-w-[620px]">
        <Callout icon={ShoppingBag} label="Shop anywhere on the web." className="absolute -left-1 top-[18%] z-10 hidden lg:flex" />
        <Callout icon={Leaf} label="Find better materials." className="absolute -right-2 top-[8%] z-10 hidden lg:flex" />
        <Callout icon={Tag} label="See similar pieces (and better prices)." className="absolute -right-2 top-[42%] z-10 hidden lg:flex" />
        <Callout icon={Sparkles} label="Shop with confidence." className="absolute -right-2 bottom-[28%] z-10 hidden lg:flex" />

        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-3 items-start">
          <div className="rounded-xl border border-neutral-200 bg-[#faf8f5] shadow-[0_16px_48px_rgba(22,21,19,0.08)] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200/80 bg-white/80 text-[9px] text-neutral-500">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5">←</span>
              <span className="flex-1 truncate">massimodutti.com/en/women/jeans</span>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#1a3328] text-[8px] font-bold text-white">
                TX
              </span>
            </div>
            <div className="p-3 grid grid-cols-[minmax(0,1fr)_88px] gap-3">
              <div>
                <div className="aspect-[3/4] rounded-lg bg-gradient-to-b from-[#e8dfd4] to-[#cbb9a8] mb-2" />
                <p className="text-[10px] font-medium text-neutral-800">Mid-waist wide-leg jeans</p>
                <p className="text-[10px] text-neutral-500">€59.95</p>
                <div className="mt-2 flex gap-1">
                  {["32", "34", "36", "38"].map((size) => (
                    <span
                      key={size}
                      className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-neutral-200 text-[8px] text-neutral-600"
                    >
                      {size}
                    </span>
                  ))}
                </div>
                <span className="mt-2 inline-flex w-full items-center justify-center rounded bg-neutral-900 text-white text-[9px] py-2">
                  Add to bag
                </span>
              </div>
              <div className="space-y-2 text-[8px] text-neutral-500 pt-1">
                <p className="uppercase tracking-wider">Details</p>
                <p>98% Cotton</p>
                <p>2% Elastane</p>
                <p className="pt-2 uppercase tracking-wider">Fit</p>
                <p>Wide leg</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-[0_20px_50px_rgba(22,21,19,0.12)] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1a3328] text-[9px] font-bold text-white">
                  TX
                </span>
                <span className="font-serif text-[11px] tracking-[0.15em] text-neutral-800">INTERTEXE</span>
              </div>
              <X className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="p-3">
              <h4 className="font-serif text-[18px] leading-tight text-neutral-900 mb-3">Better-material matches</h4>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-2.5 py-1 text-[8px] transition-colors ${
                      filter === item
                        ? "bg-[#1a3328] text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <ul className="space-y-2 mb-3">
                {matches.map((item) => (
                  <li
                    key={`${item.brand}-${item.name}`}
                    className="flex gap-2 rounded-lg border border-neutral-100 p-2 transition-opacity duration-300"
                  >
                    <span className="h-12 w-9 rounded shrink-0" style={{ background: item.tone }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] uppercase tracking-wider text-neutral-400 truncate">{item.brand}</p>
                      <p className="text-[10px] font-medium text-neutral-800 truncate">{item.name}</p>
                      <p className="text-[9px] text-neutral-500">{item.price}</p>
                      <p className="text-[8px] text-emerald-800">{item.fiber}</p>
                    </div>
                    <Heart className="h-3.5 w-3.5 text-neutral-300 shrink-0 mt-1" />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="w-full rounded-full bg-[#1a3328] text-white text-[9px] py-2.5 mb-2 hover:bg-[#122419] transition-colors"
              >
                View 12 better-material matches →
              </button>
              <div className="flex justify-between text-[8px] text-neutral-500 px-1">
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" /> Save this search
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bell className="h-3 w-3" /> Get alerts
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-[#f7f3ec] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Chrome className="h-8 w-8 text-neutral-700 shrink-0" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-400">INTERTEXE for Chrome</p>
              <p className="font-serif text-[15px] md:text-[17px] text-neutral-900 leading-snug">
                Find better-material matches while you shop online.
              </p>
            </div>
          </div>
          <a
            href={getChromeWebStoreUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1a3328] text-white text-[10px] uppercase tracking-[0.12em] px-5 py-2.5 hover:bg-[#122419] transition-colors sm:ml-auto"
            data-testid="link-home-chrome-visual-cta"
          >
            Add to Chrome →
          </a>
        </div>
      </div>
    </div>
  );
}

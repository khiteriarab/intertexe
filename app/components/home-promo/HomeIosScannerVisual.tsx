"use client";

import { useState } from "react";
import {
  Bell,
  Heart,
  Home,
  Leaf,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Zap,
} from "lucide-react";

type ScanMode = "price" | "care";

const SCAN_DATA = {
  price: {
    labelTitle: "Scan a price tag",
    tagLine1: "MASSIMO DUTTI",
    tagLine2: "€ 49.95",
    composition: [
      { name: "Cotton", pct: 94 },
      { name: "Elastane", pct: 6 },
    ],
    insight: "Mostly natural fiber",
    insightBody: "A breathable, durable and comfortable fabric.",
    matches: [
      { name: "100% Linen", price: "$120", tone: "#e8dfd0" },
      { name: "100% Wool", price: "$150", tone: "#2a2a2a" },
      { name: "100% Organic Cotton", price: "$98", tone: "#5b7fa3" },
    ],
  },
  care: {
    labelTitle: "Scan a care label",
    tagLine1: "100% CASHMERE",
    tagLine2: "DRY CLEAN ONLY",
    composition: [{ name: "Cashmere", pct: 100 }],
    insight: "Premium natural fiber",
    insightBody: "Soft, warm, and naturally breathable.",
    matches: [
      { name: "100% Cashmere", price: "$320", tone: "#c9b8a8" },
      { name: "100% Wool", price: "$180", tone: "#4a4a4a" },
      { name: "100% Merino Wool", price: "$145", tone: "#8b7355" },
    ],
  },
} as const;

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-[10px] font-medium text-neutral-500 shrink-0">
      {n}
    </span>
  );
}

function PromoCard({
  step,
  title,
  children,
  active,
  onClick,
  className = "",
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border bg-white/95 backdrop-blur-sm shadow-[0_12px_40px_rgba(22,21,19,0.08)] p-3 md:p-4 transition-all duration-300 ${
        active
          ? "border-neutral-400 ring-1 ring-neutral-300/80 scale-[1.02]"
          : "border-neutral-200/80 hover:border-neutral-300"
      } ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <StepBadge n={step} />
        <p className="font-serif text-[13px] md:text-[15px] text-neutral-900 leading-tight">{title}</p>
      </div>
      {children}
    </button>
  );
}

function PhoneMockup({ mode, onModeChange }: { mode: ScanMode; onModeChange: (mode: ScanMode) => void }) {
  return (
    <div className="relative mx-auto w-[min(100%,240px)] md:w-[min(100%,280px)]">
      <div className="rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-[0_24px_60px_rgba(22,21,19,0.18)] overflow-hidden">
        <div className="bg-white px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="font-serif text-[11px] tracking-[0.2em] text-neutral-800">INTERTEXE</span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            <Zap className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="relative aspect-[3/4] bg-[#d4c4ae]">
          <div className="absolute inset-4 border-2 border-white/70">
            <span className="absolute -top-px -left-px h-4 w-4 border-l-2 border-t-2 border-white" />
            <span className="absolute -top-px -right-px h-4 w-4 border-r-2 border-t-2 border-white" />
            <span className="absolute -bottom-px -left-px h-4 w-4 border-l-2 border-b-2 border-white" />
            <span className="absolute -bottom-px -right-px h-4 w-4 border-r-2 border-b-2 border-white" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <p className="text-[10px] text-white/90 drop-shadow">Position the tag in the frame</p>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-16 h-20 bg-white/90 rounded shadow rotate-6 flex flex-col items-center justify-center px-1">
            <p className="text-[6px] uppercase tracking-wider text-neutral-500 text-center leading-tight">
              {SCAN_DATA[mode].tagLine1}
            </p>
            <div className="my-1 h-4 w-full bg-[repeating-linear-gradient(90deg,#111_0_1px,transparent_1px_3px)] opacity-70" />
            <p className="text-[7px] font-medium text-neutral-800">{SCAN_DATA[mode].tagLine2}</p>
          </div>
        </div>

        <div className="bg-white px-3 py-2.5">
          <div className="flex rounded-full bg-neutral-100 p-0.5 text-[9px]">
            {(["price", "care"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onModeChange(key)}
                className={`flex-1 rounded-full py-1.5 transition-colors ${
                  mode === key ? "bg-neutral-900 text-white" : "text-neutral-500"
                }`}
              >
                {key === "price" ? "Price tag" : "Care label"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border-t border-neutral-100 px-2 py-2 flex justify-around text-[8px] text-neutral-400">
          <span className="flex flex-col items-center gap-0.5">
            <Home className="h-3.5 w-3.5" /> Home
          </span>
          <span className="flex flex-col items-center gap-0.5 text-[#c45c5c]">
            <ScanLine className="h-3.5 w-3.5" /> Scanner
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Shop
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <Heart className="h-3.5 w-3.5" /> Favorites
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <User className="h-3.5 w-3.5" /> Account
          </span>
        </div>
      </div>
    </div>
  );
}

/** Interactive iOS scanner flow — replaces static promo PNG. */
export function HomeIosScannerVisual() {
  const [mode, setMode] = useState<ScanMode>("price");
  const [focusStep, setFocusStep] = useState<1 | 2 | 3>(1);
  const data = SCAN_DATA[mode];

  return (
    <div
      className="relative w-full h-full min-h-[420px] md:min-h-[520px] flex items-center justify-center p-2 md:p-4"
      data-testid="home-ios-scanner-visual"
    >
      <div className="relative w-full max-w-[560px] grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[140px_1fr_140px] gap-3 md:gap-4 items-center">
        <div className="col-span-2 md:col-span-1 md:row-span-2 space-y-3">
          <PromoCard
            step={1}
            title={data.labelTitle}
            active={focusStep === 1}
            onClick={() => {
              setFocusStep(1);
              setMode("price");
            }}
          >
            <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-2 text-[9px] text-neutral-600 leading-snug">
              <p className="font-medium text-neutral-800">MASSIMO DUTTI</p>
              <div className="my-1.5 h-3 bg-[repeating-linear-gradient(90deg,#333_0_1px,transparent_1px_2px)]" />
              <p>€ 49.95</p>
            </div>
          </PromoCard>
          <p className="text-center text-[9px] uppercase tracking-[0.25em] text-neutral-400">or</p>
          <PromoCard
            step={1}
            title="Scan a care label"
            active={focusStep === 1 && mode === "care"}
            onClick={() => {
              setFocusStep(1);
              setMode("care");
            }}
          >
            <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-2 text-[9px] text-neutral-600 leading-snug">
              <p className="font-medium text-neutral-800">100% CASHMERE</p>
              <p className="mt-1 text-neutral-500">DRY CLEAN ONLY</p>
            </div>
          </PromoCard>
        </div>

        <div className="col-span-2 md:col-span-1 flex justify-center">
          <PhoneMockup mode={mode} onModeChange={(next) => { setMode(next); setFocusStep(1); }} />
        </div>

        <div className="hidden md:block space-y-3">
          <PromoCard step={2} title="Get instant results" active={focusStep === 2} onClick={() => setFocusStep(2)}>
            <div className="space-y-2">
              {data.composition.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-[10px]">
                  <span className="text-neutral-600">{row.name}</span>
                  <span className="font-medium text-neutral-900">{row.pct}%</span>
                </div>
              ))}
              <div className="pt-2 border-t border-neutral-100 flex gap-2">
                <Leaf className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-medium text-neutral-800">{data.insight}</p>
                  <p className="text-[9px] text-neutral-500 leading-relaxed">{data.insightBody}</p>
                </div>
              </div>
            </div>
          </PromoCard>

          <PromoCard step={3} title="Find better options" active={focusStep === 3} onClick={() => setFocusStep(3)}>
            <p className="text-[9px] text-neutral-500 mb-2">See similar pieces in higher quality materials</p>
            <ul className="space-y-1.5">
              {data.matches.map((item) => (
                <li key={item.name} className="flex items-center gap-2 text-[9px]">
                  <span className="h-8 w-6 rounded-sm shrink-0" style={{ background: item.tone }} />
                  <span className="text-neutral-700">{item.name}</span>
                  <span className="ml-auto text-neutral-500">{item.price}</span>
                </li>
              ))}
            </ul>
            <span className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-neutral-900 text-white text-[9px] py-2">
              View similar pieces →
            </span>
          </PromoCard>
        </div>
      </div>

      <div className="md:hidden absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-2 px-1">
        <PromoCard step={2} title="Instant results" active={focusStep === 2} onClick={() => setFocusStep(2)}>
          <p className="text-[10px] text-neutral-600">{data.insight}</p>
        </PromoCard>
        <PromoCard step={3} title="Better options" active={focusStep === 3} onClick={() => setFocusStep(3)}>
          <p className="text-[10px] text-neutral-600">{data.matches.length} matches found</p>
        </PromoCard>
      </div>
    </div>
  );
}

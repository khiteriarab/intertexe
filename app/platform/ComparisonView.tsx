"use client";

import { useState } from "react";

export type ComparisonRow = {
  capability: string;
  intertexe: string;
  fabacus: string;
  retraced: string;
  trustrace: string;
  kezzler: string;
  eon: string;
};

const PEERS = [
  { key: "fabacus", label: "Fabacus" },
  { key: "retraced", label: "Retraced" },
  { key: "trustrace", label: "TrusTrace" },
  { key: "kezzler", label: "Kezzler" },
  { key: "eon", label: "EON" },
] as const;

type PeerKey = (typeof PEERS)[number]["key"];

export function ComparisonView({
  rows,
  reviewed,
}: {
  rows: ComparisonRow[];
  reviewed: string;
}) {
  const [peer, setPeer] = useState<PeerKey>("fabacus");
  const selected = PEERS.find((item) => item.key === peer) ?? PEERS[0];

  return (
    <>
      <div className="lg:hidden mb-10">
        <label htmlFor="platform-compare-peer" className="block text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">
          Compare INTERTEXE with
        </label>
        <select
          id="platform-compare-peer"
          value={peer}
          onChange={(event) => setPeer(event.target.value as PeerKey)}
          className="w-full bg-white border border-[#e8e3da] text-base px-3 py-3 mb-6 min-h-[44px]"
        >
          {PEERS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="space-y-5">
          {rows.map((row) => (
            <article key={row.capability} className="border-t border-[#e8e3da] pt-4">
              <h3 className="text-sm font-medium mb-3">{row.capability}</h3>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[#152238] mb-1">INTERTEXE</p>
              <p className="text-sm text-[#152238] mb-3 leading-relaxed">{row.intertexe}</p>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[#8a847c] mb-1">{selected.label}</p>
              <p className="text-sm text-[#5c5854] leading-relaxed">{row[selected.key]}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="hidden lg:block overflow-x-auto mb-10">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-[#161513]">
              {["Capability", "INTERTEXE", "Fabacus", "Retraced", "TrusTrace", "Kezzler", "EON"].map((heading) => (
                <th key={heading} className="py-3 pr-4 font-medium align-bottom">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.capability} className="border-b border-[#e8e3da] align-top">
                <th className="py-3 pr-4 font-medium text-[#161513]">{row.capability}</th>
                <td className="py-3 pr-4 text-[#152238]">{row.intertexe}</td>
                <td className="py-3 pr-4 text-[#5c5854]">{row.fabacus}</td>
                <td className="py-3 pr-4 text-[#5c5854]">{row.retraced}</td>
                <td className="py-3 pr-4 text-[#5c5854]">{row.trustrace}</td>
                <td className="py-3 pr-4 text-[#5c5854]">{row.kezzler}</td>
                <td className="py-3 pr-4 text-[#5c5854]">{row.eon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#8a847c] mb-12 leading-relaxed max-w-3xl">
        Comparison based on publicly available product information from each company&apos;s official site. Features
        may vary by deployment. Last reviewed {reviewed}. Cells that cannot be verified are marked
        &quot;Not publicly confirmed.&quot;
      </p>
    </>
  );
}

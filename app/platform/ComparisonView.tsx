"use client";

import { useState, type ReactNode } from "react";

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
type MarkLevel = "core" | "partial" | "unconfirmed";

const PILLARS = [
  {
    title: "Material intelligence",
    copy: "Understand what materials are in your catalog.",
    icon: "layers",
  },
  {
    title: "Benchmarking",
    copy: "Compare your strategy and data quality to peers.",
    icon: "bars",
  },
  {
    title: "Data quality",
    copy: "Find what is missing, conflicting or incomplete.",
    icon: "shield",
  },
  {
    title: "Supplier data",
    copy: "Connect supplier declarations and evidence.",
    icon: "nodes",
  },
  {
    title: "Regulatory intelligence",
    copy: "Track requirements and readiness across your catalog.",
    icon: "doc",
  },
  {
    title: "DPP creation & hosting",
    copy: "Publish passports and update them when you are ready.",
    icon: "globe",
  },
] as const;

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
      <ul className="grid grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-8 mb-12 sm:mb-16">
        {PILLARS.map((pillar) => (
          <li key={pillar.title} className="min-w-0">
            <span className="mb-3 flex h-9 items-center text-[#152238]" aria-hidden="true">
              <PillarIcon name={pillar.icon} />
            </span>
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#152238] mb-2">{pillar.title}</p>
            <p className="text-[13px] text-[#5c5854] font-light leading-relaxed">{pillar.copy}</p>
          </li>
        ))}
      </ul>

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
              <p className="text-sm text-[#152238] mb-3 leading-relaxed">
                <Mark level={markLevel(row.intertexe)} /> {row.intertexe}
              </p>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[#8a847c] mb-1">{selected.label}</p>
              <p className="text-sm text-[#5c5854] leading-relaxed">
                <Mark level={markLevel(row[selected.key])} /> {row[selected.key]}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="hidden lg:block overflow-x-auto mb-8">
        <table className="w-full text-left text-[12px] border-collapse min-w-[920px]">
          <thead>
            <tr className="border-b border-[#e8e3da]">
              <th className="py-3 pr-3 font-medium align-bottom text-[#8a847c] w-[18%]">Capability</th>
              <th className="py-3 px-3 font-medium align-bottom bg-[#152238] text-white w-[18%]">INTERTEXE</th>
              {PEERS.map((item) => (
                <th key={item.key} className="py-3 px-2 font-medium align-bottom text-[#161513]">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.capability} className="border-b border-[#e8e3da] align-top">
                <th className="py-3.5 pr-3 font-medium text-[#161513]">
                  <span className="inline-flex items-start gap-2">
                    <span className="mt-0.5 text-[#152238]" aria-hidden="true">
                      <RowIcon capability={row.capability} />
                    </span>
                    <span>{row.capability}</span>
                  </span>
                </th>
                <td className="py-3.5 px-3 bg-[#f4f6f8] text-[#152238] border-x border-[#e8e3da]">
                  <Cell text={row.intertexe} emphasis />
                </td>
                <td className="py-3.5 px-2 text-[#5c5854]">
                  <Cell text={row.fabacus} />
                </td>
                <td className="py-3.5 px-2 text-[#5c5854]">
                  <Cell text={row.retraced} />
                </td>
                <td className="py-3.5 px-2 text-[#5c5854]">
                  <Cell text={row.trustrace} />
                </td>
                <td className="py-3.5 px-2 text-[#5c5854]">
                  <Cell text={row.kezzler} />
                </td>
                <td className="py-3.5 px-2 text-[#5c5854]">
                  <Cell text={row.eon} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#5c5854] mb-4">
            <li className="inline-flex items-center gap-2">
              <Mark level="core" /> Core strength
            </li>
            <li className="inline-flex items-center gap-2">
              <Mark level="partial" /> Partial / selective
            </li>
            <li className="inline-flex items-center gap-2">
              <Mark level="unconfirmed" /> Not publicly confirmed
            </li>
          </ul>
          <p className="text-xs text-[#8a847c] leading-relaxed max-w-3xl">
            Comparison based on publicly available product information from each company&apos;s official site. Features
            may vary by deployment. Last reviewed {reviewed}. Cells that cannot be verified are marked
            &quot;Not publicly confirmed.&quot;
          </p>
        </div>
        <details className="border border-[#e8e3da] bg-white px-5 py-4 max-w-sm">
          <summary className="cursor-pointer list-none text-sm text-[#152238] [&::-webkit-details-marker]:hidden">
            Want the technical details?
            <span className="mt-1 block text-[11px] tracking-[0.12em] uppercase">
              View detailed comparison table →
            </span>
          </summary>
          <p className="mt-3 text-xs text-[#5c5854] leading-relaxed">
            Circle marks follow the published wording in each cell — Core, selective or developing, and Not publicly
            confirmed. They do not invent competitor gaps.
          </p>
        </details>
      </div>
    </>
  );
}

function Cell({ text, emphasis = false }: { text: string; emphasis?: boolean }) {
  return (
    <span className="flex items-start gap-2 leading-relaxed">
      <Mark level={markLevel(text)} />
      <span className={emphasis ? "text-[#152238]" : undefined}>{text}</span>
    </span>
  );
}

function markLevel(text: string): MarkLevel {
  const value = text.trim();
  const lower = value.toLowerCase();
  if (!value || value === "—" || value === "-" || lower.includes("not publicly confirmed")) {
    return "unconfirmed";
  }
  if (
    lower.includes("selective") ||
    lower.includes("developing") ||
    lower.includes("in build") ||
    lower.includes("roadmap") ||
    lower.includes("partner") ||
    lower.includes("available within") ||
    lower.includes("differs") ||
    lower.includes("focused")
  ) {
    return "partial";
  }
  return "core";
}

function Mark({ level }: { level: MarkLevel }) {
  const label =
    level === "core" ? "Core strength" : level === "partial" ? "Partial / selective" : "Not publicly confirmed";
  return (
    <span className="inline-flex mt-0.5 shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
        {level === "core" ? <circle cx="8" cy="8" r="6" fill="#152238" /> : null}
        {level === "partial" ? (
          <>
            <circle cx="8" cy="8" r="6" fill="none" stroke="#152238" strokeWidth="1.4" />
            <path d="M8 2a6 6 0 0 1 0 12Z" fill="#152238" />
          </>
        ) : null}
        {level === "unconfirmed" ? (
          <circle cx="8" cy="8" r="6" fill="none" stroke="#c5bfb6" strokeWidth="1.4" />
        ) : null}
      </svg>
    </span>
  );
}

function PillarIcon({ name }: { name: (typeof PILLARS)[number]["icon"] }) {
  const props = { width: 28, height: 28, fill: "none", stroke: "#152238", strokeWidth: 1.4 };
  if (name === "layers") {
    return (
      <svg {...props} viewBox="0 0 28 28">
        <path d="M4 10.5 14 6l10 4.5L14 15 4 10.5Z" />
        <path d="M4 14.5 14 19l10-4.5" />
        <path d="M4 18 14 22.5 24 18" />
      </svg>
    );
  }
  if (name === "bars") {
    return (
      <svg {...props} viewBox="0 0 28 28">
        <path d="M6 22V12" />
        <path d="M14 22V6" />
        <path d="M22 22v-8" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...props} viewBox="0 0 28 28">
        <path d="M14 4.5 22 8v7.2c0 5-3.4 7.8-8 9.3-4.6-1.5-8-4.3-8-9.3V8l8-3.5Z" />
        <path d="m10.5 14 2.4 2.4 5.2-5.2" />
      </svg>
    );
  }
  if (name === "nodes") {
    return (
      <svg {...props} viewBox="0 0 28 28">
        <circle cx="14" cy="7" r="2.2" />
        <circle cx="7" cy="20" r="2.2" />
        <circle cx="21" cy="20" r="2.2" />
        <path d="M12.3 8.6 8.6 18.2" />
        <path d="M15.7 8.6 19.4 18.2" />
        <path d="M9.4 20h9.2" />
      </svg>
    );
  }
  if (name === "doc") {
    return (
      <svg {...props} viewBox="0 0 28 28">
        <path d="M9 5.5h7.5L21 10v12.5H9V5.5Z" />
        <path d="M16.5 5.5V10H21" />
        <path d="M12 14.5h6" />
        <path d="M12 18h6" />
      </svg>
    );
  }
  return (
    <svg {...props} viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="8.5" />
      <path d="M5.5 14h17" />
      <path d="M14 5.5c2.4 2.8 3.6 5.7 3.6 8.5S16.4 19.7 14 22.5c-2.4-2.8-3.6-5.7-3.6-8.5S11.6 8.3 14 5.5Z" />
    </svg>
  );
}

function RowIcon({ capability }: { capability: string }) {
  const props = { width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 1.3 };
  const icons: Record<string, ReactNode> = {
    "Connected stack": (
      <svg {...props} viewBox="0 0 14 14">
        <rect x="1.5" y="1.5" width="4.5" height="4.5" />
        <rect x="8" y="1.5" width="4.5" height="4.5" />
        <rect x="1.5" y="8" width="4.5" height="4.5" />
        <path d="M10.2 6v2H8" />
      </svg>
    ),
    "Digital Product Passport infrastructure": (
      <svg {...props} viewBox="0 0 14 14">
        <rect x="2" y="3" width="10" height="8" />
        <circle cx="7" cy="7" r="2.2" />
      </svg>
    ),
    "Structured product data": (
      <svg {...props} viewBox="0 0 14 14">
        <ellipse cx="7" cy="4" rx="4.2" ry="1.6" />
        <path d="M2.8 4v6c0 .9 1.9 1.6 4.2 1.6s4.2-.7 4.2-1.6V4" />
      </svg>
    ),
    "Material normalization / intelligence": (
      <svg {...props} viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="1.2" />
        <circle cx="3" cy="4" r="1" />
        <circle cx="11" cy="4" r="1" />
        <circle cx="4" cy="11" r="1" />
        <circle cx="10" cy="11" r="1" />
        <path d="M4 4.6 6 6.2M10 4.6 8 6.2M5 10.2 6.4 8.2M9 10.2 7.6 8.2" />
      </svg>
    ),
    "Supply-chain traceability": (
      <svg {...props} viewBox="0 0 14 14">
        <path d="M1.5 9h7.5l2 2H13" />
        <path d="M3 9V6.5h5.5V9" />
        <circle cx="4" cy="11.2" r="1" />
        <circle cx="9.2" cy="11.2" r="1" />
      </svg>
    ),
    "Persistent product identity / QR": (
      <svg {...props} viewBox="0 0 14 14">
        <path d="M2.5 2.5h3.5v3.5H2.5zM8 2.5h3.5v3.5H8zM2.5 8h3.5v3.5H2.5z" />
        <path d="M8 8h1.5v1.5H8zM10.5 8H11.5V9.5H10.5zM8 10.5h3.5V12H8z" />
      </svg>
    ),
    "Consumer-facing digital experience": (
      <svg {...props} viewBox="0 0 14 14">
        <rect x="4" y="1.5" width="6" height="11" rx="1" />
        <path d="M6.2 10.8h1.6" />
      </svg>
    ),
    "Brand API / integration path": (
      <svg {...props} viewBox="0 0 14 14">
        <path d="M5 3.5 2.5 7 5 10.5" />
        <path d="M9 3.5 11.5 7 9 10.5" />
      </svg>
    ),
    "Material peer benchmarking": (
      <svg {...props} viewBox="0 0 14 14">
        <path d="M2 10.5 5.2 7.2 7.8 9.1 12 4.5" />
      </svg>
    ),
    "Consumer-demand connection": (
      <svg {...props} viewBox="0 0 14 14">
        <circle cx="7" cy="5" r="2.1" />
        <path d="M3.2 12c.6-2.3 2-3.4 3.8-3.4S10.2 9.7 10.8 12" />
      </svg>
    ),
  };
  return icons[capability] ?? null;
}

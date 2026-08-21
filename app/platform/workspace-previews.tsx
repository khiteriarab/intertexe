"use client";

import { useState, type ReactNode } from "react";
import { DEMO_CATALOG, DEMO_ISSUE_LABEL } from "../../lib/material-intelligence/demo-catalog";
import { QrMark, SERIF } from "./platform-ui";

const NAV = ["Overview", "Products", "Materials", "Issues", "Benchmark", "Passports", "Monitor"] as const;
export type WorkspaceNav = (typeof NAV)[number];

const CAPTION = "Illustrative workspace. Not a live customer catalog.";

export function WorkspaceChrome({
  active,
  issueCount = "487",
  children,
  caption = CAPTION,
  className = "",
}: {
  active: WorkspaceNav;
  issueCount?: string;
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={`m-0 ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-[#d5dee8] bg-white shadow-[0_28px_70px_rgba(21,34,56,0.12)]">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#eeeae4] bg-[#faf8f5]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="ml-2 text-[10px] tracking-[0.14em] uppercase text-[#8a847c]">INTERTEXE workspace</span>
        </div>
        <div className="sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <aside className="hidden sm:flex flex-col justify-between bg-[#152238] text-white px-3 py-5 min-h-0">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/55 mb-5 px-2">INTERTEXE</p>
              <ul className="space-y-0.5">
                {NAV.map((item) => (
                  <li
                    key={item}
                    className={`text-[11px] tracking-[0.12em] uppercase px-2 py-2 rounded-sm ${
                      item === active ? "bg-white/15" : "text-white/65"
                    }`}
                  >
                    {item}
                    {item === "Issues" ? (
                      <span className="ml-2 text-[9px] tracking-normal normal-case bg-[#9c7b8b] px-1.5 py-0.5">
                        {issueCount}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/45 px-2 mt-8">Sample workspace</p>
          </aside>
          <div className="min-w-0 p-4 sm:p-5 bg-[#f7f5f1]">{children}</div>
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

const METRICS = [
  ["12,430", "Products", "+342 this month"],
  ["24,219", "Material records", "+687 this month"],
  ["81%", "Complete records", "↑ 9% vs last month"],
  ["487", "Issues to resolve", "−56 vs last month"],
  ["2,341", "Passports published", "+301 this month"],
] as const;

const FIBERS = [
  ["Cotton", 36, "#d9cbb8"],
  ["Polyester", 28, "#7d9bb8"],
  ["Viscose", 13, "#9c7b8b"],
  ["Wool", 8, "#c4a574"],
  ["Linen", 6, "#b08968"],
  ["Silk", 4, "#c9b8d4"],
  ["Other", 5, "#d4cdc4"],
] as const;

const PEERS = [
  ["Natural fiber share", "57%", "46%"],
  ["Synthetic share", "43%", "54%"],
  ["Silk assortment", "14%", "9%"],
  ["Linen assortment", "6%", "3%"],
  ["Complete material data", "81%", "69%"],
  ["Passport-ready", "62%", "48%"],
] as const;

const ISSUE_FILTERS = [
  ["All", "487"],
  ["Missing information", "219"],
  ["Composition conflict", "148"],
  ["Invalid percentages", "62"],
  ["Missing supplier", "38"],
  ["Missing identifier", "20"],
] as const;

const ISSUE_ROWS = [
  {
    severity: "High",
    issue: "Composition conflict — supplier does not match label",
    product: "Dress 8721",
    category: "Dresses",
    detail: [
      "Label: 70% Cotton / 30% Polyamide (nylon)",
      "Supplier: 65% Cotton / 35% Polyamide (nylon)",
      "Review supplier data. INTERTEXE does not overwrite either source.",
    ],
  },
  {
    severity: "High",
    issue: "Invalid percentages — totals do not add to 100%",
    product: "Wool Trouser 331",
    category: "Trousers",
    detail: [
      "Recorded fibers do not total 100%.",
      "Original source string is retained. INTERTEXE does not invent a corrected mix.",
    ],
  },
  {
    severity: "Medium",
    issue: "Missing identifier — GTIN or SKU is missing",
    product: "Silk Shirt 891",
    category: "Shirts",
    detail: ["GTIN or SKU is missing. Unknown stays unknown until a source provides it."],
  },
  {
    severity: "Medium",
    issue: "Missing supplier — supplier information is incomplete",
    product: "Linen Top 221",
    category: "Tops",
    detail: ["Supplier composition is incomplete. The label string is still on the record."],
  },
  {
    severity: "Low",
    issue: "Missing information — country of origin is missing",
    product: "Cashmere Knit 112",
    category: "Knitwear",
    detail: ["Country of origin is missing. INTERTEXE does not fabricate a country."],
  },
] as const;

const SIGNAL = [
  ["Silk demand", "↑ 18%", true],
  ["Linen demand", "↑ 11%", true],
  ["Wool demand", "↑ 6%", true],
  ["Polyester engagement", "↓ 7%", false],
] as const;

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 bg-white border border-[#e8e3da] p-4 ${className}`}>{children}</div>;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "alert" | "ok" }) {
  const cls =
    tone === "alert"
      ? "bg-[#f3e6e6] text-[#8b2e2e]"
      : tone === "ok"
        ? "bg-[#e8eef4] text-[#152238]"
        : "bg-[#f0ebe4] text-[#5c5854]";
  return <span className={`inline-block max-w-full break-words text-[11px] px-2 py-1 ${cls}`}>{children}</span>;
}

function filterIssueRows(filter: (typeof ISSUE_FILTERS)[number][0]) {
  if (filter === "All") return ISSUE_ROWS;
  const prefix =
    filter === "Composition conflict"
      ? "Composition conflict"
      : filter === "Invalid percentages"
        ? "Invalid percentages"
        : filter === "Missing identifier"
          ? "Missing identifier"
          : filter === "Missing supplier"
            ? "Missing supplier"
            : "Missing information";
  return ISSUE_ROWS.filter((row) => row.issue.startsWith(prefix));
}

function OverviewBody() {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mb-4">
        {METRICS.map(([n, label, delta]) => (
          <Card key={label}>
            <p className="text-xl sm:text-2xl font-light tabular-nums" style={SERIF}>
              {n}
            </p>
            <p className="text-[10px] tracking-[0.1em] uppercase text-[#8a847c] mt-1 break-words">{label}</p>
            <p className="text-[10px] text-[#8a847c] mt-1 hidden sm:block">{delta}</p>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-3">
        <Card>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">Material composition</p>
          <div className="flex h-2 overflow-hidden bg-[#ebe4da] mb-4" aria-hidden="true">
            {FIBERS.map(([name, pct, color]) => (
              <span key={name} style={{ width: `${pct}%`, background: color }} />
            ))}
          </div>
          <ul className="space-y-1.5 text-xs text-[#5c5854]">
            {FIBERS.map(([name, pct]) => (
              <li key={name} className="flex justify-between gap-2">
                <span className="min-w-0 break-words">{name}</span>
                <span className="tabular-nums shrink-0">{pct}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">Your brand vs peers</p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] tracking-[0.1em] uppercase text-[#8a847c]">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium">You</th>
                <th className="pb-2 font-medium">Peers</th>
              </tr>
            </thead>
            <tbody>
              {PEERS.map(([metric, you, peer]) => (
                <tr key={metric} className="border-t border-[#eeeae4]">
                  <td className="py-1.5 pr-2 break-words">{metric}</td>
                  <td className="py-1.5 tabular-nums" style={SERIF}>
                    {you}
                  </td>
                  <td className="py-1.5 tabular-nums text-[#5c5854]">{peer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">Issues to resolve</p>
          <ul className="divide-y divide-[#eeeae4] text-sm">
            {ISSUE_FILTERS.slice(1).map(([label, count]) => (
              <li key={label} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 break-words">{label}</span>
                <span className="text-[#8a847c] tabular-nums shrink-0">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function NormalizeBody() {
  return (
    <div>
      <p className="text-sm mb-4" style={SERIF}>
        Dress 8721
      </p>
      <div className="grid grid-cols-1 gap-3 min-w-0">
        <Card>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">Source data · raw</p>
          <dl className="text-sm space-y-2">
            {[
              ["Item name", "Dress 8721"],
              ["Composition (label)", "70 CO / 30 PA"],
              ["Lining", "viscose"],
              ["Supplier composition", "65 cotton / 35 nylon"],
              ["Country of origin", "—"],
              ["Care", "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2 first:border-0 first:pt-0"
              >
                <dt className="text-[#8a847c] shrink-0">{k}</dt>
                <dd className="font-mono text-[12px] text-right break-words min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <div className="flex items-center justify-center py-1">
          <span
            className="w-8 h-8 rounded-full bg-[#9c7b8b] text-white text-sm flex items-center justify-center"
            aria-hidden="true"
          >
            →
          </span>
          <span className="sr-only">Normalized INTERTEXE record</span>
        </div>
        <Card>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#152238] mb-3">INTERTEXE record</p>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-1">Composition · normalized</p>
          <p className="mb-2 flex flex-wrap gap-1">
            <Pill>70% Cotton</Pill>
            <Pill>30% Polyamide (nylon)</Pill>
          </p>
          <p className="text-xs text-[#8b2e2e] mb-3 break-words">Composition conflict with supplier data.</p>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-1">Original string</p>
          <p className="font-mono text-[12px] mb-3 break-words">70 CO / 30 PA</p>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-1">Lining</p>
          <p className="mb-3 flex flex-wrap gap-1">
            <Pill>100% Viscose</Pill>
          </p>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-1">Supplier composition</p>
          <p className="mb-2 flex flex-wrap gap-1">
            <Pill>65% Cotton</Pill>
            <Pill>35% Polyamide (nylon)</Pill>
          </p>
          <p className="text-xs text-[#8b2e2e] mb-3 break-words">Composition conflict.</p>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-1">Country of origin</p>
          <p className="flex flex-wrap gap-1">
            <Pill tone="alert">Missing</Pill>
          </p>
        </Card>
      </div>
    </div>
  );
}

function IssuesBody() {
  const [filter, setFilter] = useState<(typeof ISSUE_FILTERS)[number][0]>("All");
  const rows = filterIssueRows(filter);

  return (
    <div>
      <p className="text-sm mb-4" style={SERIF}>
        Issues inbox
      </p>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ISSUE_FILTERS.map(([label, count]) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(label)}
            className={`shrink-0 text-[10px] tracking-[0.1em] uppercase px-3 py-2 border min-h-[36px] ${
              filter === label ? "bg-[#9c7b8b] text-white border-[#9c7b8b]" : "bg-white border-[#e8e3da] text-[#6f6a63]"
            }`}
          >
            {label} {count}
          </button>
        ))}
      </div>
      <div className="bg-white border border-[#e8e3da]">
        <div className="hidden sm:grid grid-cols-[4.75rem_minmax(0,1fr)_7.5rem] gap-3 px-3 py-3 text-[10px] tracking-[0.12em] uppercase text-[#8a847c] border-b border-[#e8e3da]">
          <span>Severity</span>
          <span>Issue</span>
          <span>Product</span>
        </div>
        <ul>
          {rows.map((row) => {
            const open = row.product === "Dress 8721";
            return (
              <li key={row.product} className={`px-3 py-3 min-w-0 border-b border-[#eeeae4] last:border-0 ${open ? "bg-[#f7f1f3]" : ""}`}>
                <div className="grid grid-cols-1 sm:grid-cols-[4.75rem_minmax(0,1fr)_7.5rem] gap-1 sm:gap-3 items-start">
                  <span className={`text-sm ${row.severity === "High" ? "text-[#8b2e2e]" : "text-[#8a847c]"}`}>
                    {row.severity}
                  </span>
                  <span className="text-sm break-words min-w-0">{row.issue}</span>
                  <span className="text-xs sm:text-sm text-[#8a847c] break-words min-w-0">
                    {row.product}
                    <span className="sm:hidden"> · {row.category}</span>
                  </span>
                </div>
                {open ? (
                  <div className="mt-3 text-xs text-[#5c5854] space-y-1 min-w-0">
                    {row.detail.map((line) => (
                      <p key={line} className="break-words">
                        {line}
                      </p>
                    ))}
                    <p className="text-[#8a847c]">{row.category}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
          {rows.length === 0 ? (
            <li className="py-6 px-3 text-sm text-[#8a847c]">
              No sample rows in this filter. Illustrative inbox — counts are not a live catalog.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function BenchmarkBody() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
      <Card>
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-4">Your material position</p>
        <ul className="space-y-4">
          {PEERS.map(([metric, you, peer]) => {
            const youN = parseFloat(you);
            const peerN = parseFloat(peer);
            return (
              <li key={metric}>
                <div className="flex justify-between gap-2 text-xs mb-1">
                  <span className="min-w-0 break-words">{metric}</span>
                  <span className="tabular-nums text-[#8a847c] shrink-0">
                    {you} / {peer}
                  </span>
                </div>
                <div className="relative h-2 bg-[#eeeae4]">
                  <span
                    className="absolute inset-y-0 left-0 bg-[#cfc9c0]"
                    style={{ width: `${Math.min(peerN, 100)}%` }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 bg-[#152238]"
                    style={{ width: `${Math.min(youN, 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] tracking-[0.1em] uppercase text-[#8a847c] mt-4">
          Navy = your brand · Grey = peer group
        </p>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c]">INTERTEXE consumer signal</p>
          <span className="text-[10px] tracking-[0.1em] uppercase bg-[#f3e6e6] text-[#8b2e2e] px-2 py-1">
            Coming / developing
          </span>
        </div>
        <ul className="divide-y divide-[#eeeae4]">
          {SIGNAL.map(([label, delta, up]) => (
            <li key={label} className="flex justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 break-words">{label}</span>
              <span className={`tabular-nums shrink-0 ${up ? "text-[#152238]" : "text-[#8b2e2e]"}`}>{delta}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#5c5854] mt-4 leading-relaxed">
          Not a live statistical product yet. Observed demand comes from the consumer side of INTERTEXE.
        </p>
      </Card>
    </div>
  );
}

function PassportBody() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
      <Card>
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#152238] mb-2">01 · Ready to publish</p>
        <p className="text-base mb-1 break-words" style={SERIF}>
          Silk Evening Dress
        </p>
        <p className="text-xs text-[#8a847c] mb-4">ITX-4102</p>
        <ul className="text-sm space-y-2 mb-4">
          {["Materials", "Manufacturing", "Care", "Traceability", "Product identity"].map((item) => (
            <li key={item} className="flex justify-between gap-2 border-t border-[#eeeae4] pt-2">
              <span className="min-w-0 break-words">{item}</span>
              <Pill tone="ok">Complete</Pill>
            </li>
          ))}
        </ul>
        <span className="inline-flex text-[10px] tracking-[0.12em] uppercase bg-[#9c7b8b] text-white px-4 py-2">
          Publish passport
        </span>
      </Card>
      <Card className="flex flex-col items-center text-center">
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-4 w-full text-left">
          02 · Product identity
        </p>
        <QrMark />
        <p className="font-mono text-[11px] mt-4 mb-1 break-all">INTX-ITX-4102</p>
        <p className="text-xs text-[#8a847c]">Ready to publish</p>
      </Card>
      <div className="mx-auto w-full max-w-[260px] rounded-[28px] border border-[#e8e3da] bg-white p-5 shadow-[0_16px_40px_rgba(22,21,19,0.06)]">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#8a847c] mb-2">03 · Passport</p>
        <p className="text-lg mb-1 break-words" style={SERIF}>
          Silk Evening Dress
        </p>
        <p className="text-[10px] tracking-[0.12em] uppercase text-[#9c7b8b] mb-4">Materials</p>
        <ul className="text-sm text-[#5c5854] space-y-2">
          <li className="border-t border-[#eeeae4] pt-2 break-words">92% Silk · 8% Elastane</li>
          <li className="border-t border-[#eeeae4] pt-2 break-words">Lining · 100% Viscose</li>
          <li className="border-t border-[#eeeae4] pt-2 break-words">Manufacturing · Portugal</li>
        </ul>
        <p className="text-[10px] text-[#8a847c] mt-4 leading-relaxed">
          Illustrative passport. Not a regulatory certification.
        </p>
      </div>
    </div>
  );
}

function MonitorBody() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
      <Card>
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-2">Requirement update · EU / Textiles</p>
        <p className="text-2xl font-light tabular-nums mb-3" style={SERIF}>
          10,000 products evaluated
        </p>
        <ul className="text-sm space-y-2">
          <li className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
            <span className="min-w-0 break-words">No action required</span>
            <span className="tabular-nums shrink-0">9,614</span>
          </li>
          <li className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
            <span className="min-w-0 break-words">Need additional information</span>
            <span className="tabular-nums shrink-0">311</span>
          </li>
          <li className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
            <span className="min-w-0 break-words">Require review</span>
            <span className="tabular-nums shrink-0">75</span>
          </li>
        </ul>
      </Card>
      <Card>
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">Preparation status</p>
        <ul className="text-sm space-y-2">
          {[
            ["French AGEC", "Review"],
            ["EU ESPR textiles", "Missing information"],
            ["Digital Product Passport", "In progress"],
          ].map(([name, status]) => (
            <li key={name} className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
              <span className="min-w-0 break-words">{name}</span>
              <span className="text-[#8a847c] text-right break-words">{status}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#8a847c] mt-4 leading-relaxed">
          Illustrative example. INTERTEXE does not provide legal certification.
        </p>
      </Card>
    </div>
  );
}

export function OverviewPreview({ className = "mt-12 sm:mt-16", caption }: { className?: string; caption?: string }) {
  return (
    <WorkspaceChrome active="Overview" className={className} caption={caption}>
      <OverviewBody />
    </WorkspaceChrome>
  );
}

export function NormalizePreview({ className = "mb-10", caption }: { className?: string; caption?: string }) {
  return (
    <WorkspaceChrome
      active="Products"
      className={className}
      caption={caption ?? `${CAPTION} Original source strings are retained.`}
    >
      <NormalizeBody />
    </WorkspaceChrome>
  );
}

export function IssuesPreview({ className = "mb-8", caption }: { className?: string; caption?: string }) {
  return (
    <WorkspaceChrome active="Issues" className={className} caption={caption}>
      <IssuesBody />
    </WorkspaceChrome>
  );
}

export function BenchmarkPreview({ className = "mb-8", caption }: { className?: string; caption?: string }) {
  return (
    <WorkspaceChrome
      active="Benchmark"
      className={className}
      caption={caption ?? `${CAPTION} Individual customer data is never exposed. Consumer signal is coming / developing.`}
    >
      <BenchmarkBody />
    </WorkspaceChrome>
  );
}

export function PassportPreview({ className = "mb-10", caption }: { className?: string; caption?: string }) {
  return (
    <WorkspaceChrome
      active="Passports"
      className={className}
      caption={caption ?? "Illustrative passport workflow. Not a regulatory certification. The INTERTEXE scanner is not required."}
    >
      <PassportBody />
    </WorkspaceChrome>
  );
}

export function RegulatoryPreview({ className = "mb-0", caption }: { className?: string; caption?: string }) {
  return (
    <WorkspaceChrome
      active="Monitor"
      className={className}
      caption={caption ?? "Tracked requirements and preparation status — not certification."}
    >
      <MonitorBody />
    </WorkspaceChrome>
  );
}

export function CatalogPreview({
  mode = "both",
  className = "mb-6",
}: {
  mode?: "source" | "normalized" | "both";
  className?: string;
}) {
  const showSource = mode === "source" || mode === "both";
  const showNormalized = mode === "normalized" || mode === "both";
  return (
    <WorkspaceChrome
      active="Products"
      issueCount={String(DEMO_CATALOG.filter((p) => p.issues.length).length)}
      className={className}
      caption={`${CAPTION} Ten INTERTEXE sample products. Missing fields stay missing.`}
    >
      <div className={`grid gap-3 min-w-0 ${showSource && showNormalized ? "lg:grid-cols-2" : ""}`}>
        {showSource ? (
          <div className="overflow-x-auto bg-white border border-[#e8e3da] min-w-0">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] px-3 py-2 border-b border-[#e8e3da]">
              Source data · 10 products
            </p>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] tracking-[0.1em] uppercase text-[#8a847c] border-b border-[#eeeae4]">
                  <th className="py-2 px-3 font-medium">SKU</th>
                  <th className="py-2 px-3 font-medium">Product</th>
                  <th className="py-2 px-3 font-medium">Label</th>
                  <th className="py-2 px-3 font-medium">Origin</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_CATALOG.map((product) => (
                  <tr key={product.id} className="border-b border-[#eeeae4] last:border-0">
                    <td className="py-2 px-3 font-mono whitespace-nowrap">{product.sku}</td>
                    <td className="py-2 px-3 break-words">{product.name}</td>
                    <td className="py-2 px-3 font-mono break-words">{product.source.main}</td>
                    <td className="py-2 px-3 text-[#8a847c]">{product.source.origin || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {showNormalized ? (
          <div className="overflow-x-auto bg-white border border-[#e8e3da] min-w-0">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#152238] px-3 py-2 border-b border-[#e8e3da]">
              INTERTEXE record
            </p>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] tracking-[0.1em] uppercase text-[#8a847c] border-b border-[#eeeae4]">
                  <th className="py-2 px-3 font-medium">SKU</th>
                  <th className="py-2 px-3 font-medium">Normalized</th>
                  <th className="py-2 px-3 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_CATALOG.map((product) => (
                  <tr key={product.id} className="border-b border-[#eeeae4] last:border-0">
                    <td className="py-2 px-3 font-mono whitespace-nowrap">{product.sku}</td>
                    <td className="py-2 px-3 break-words">{product.normalized.shell}</td>
                    <td className="py-2 px-3 text-[#8b2e2e] break-words">
                      {product.issues[0] ? DEMO_ISSUE_LABEL[product.issues[0]] : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </WorkspaceChrome>
  );
}

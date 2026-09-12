import { QrMark, SERIF } from "./platform-ui";
import {
  enterpriseModuleCatalogByGroup,
  marketingMaturityFootnote,
} from "../../lib/enterprise/marketing-modules";
import { implementationLabel, type ImplementationState } from "../../lib/enterprise/page-states";

export { DataArchitectureVisual as ProblemConvergenceVisual } from "./b2b-visuals/DataArchitectureVisual";
export { JourneyStepsVisual } from "./b2b-visuals/ProductDataJourneyVisual";
export { ConsumerEcosystemVisual } from "./b2b-visuals/FashionEcosystemVisual";
export { ProductIdentityCarriersVisual } from "./b2b-visuals/ProductIdentityCarriersVisual";
export { ProductLifecycleVisual } from "./b2b-visuals/ProductLifecycleVisual";
export { DeliveryModesVisual } from "./b2b-visuals/DeliveryModesVisual";
export { PublishExperienceVisual } from "./b2b-visuals/PublishExperienceVisual";

/** Journey stages: Connect · Normalize · Resolve · Understand · Publish */
/** Ecosystem consumer lane: Discover · Scan · Compare */

const MATURITY_BADGE: Record<ImplementationState, string> = {
  implemented: "bg-[#e4edea] text-[#2c4a3e]",
  partial: "bg-[#f5efd8] text-[#7a6218]",
  placeholder: "bg-[#f0ebe4] text-[#8a847c]",
};

const PEERS = [
  ["Natural fiber share", "57%", "46%"],
  ["Synthetic share", "43%", "54%"],
  ["Complete material data", "81%", "69%"],
  ["Passport-ready", "62%", "48%"],
] as const;

const CONVERSION_COHORTS = [
  { cohort: "Silk & fine naturals", index: "+18", tone: "up" as const, signal: "Outperforming peer median" },
  { cohort: "Cotton basics", index: "-11", tone: "down" as const, signal: "Under index vs segment" },
  { cohort: "Recycled synthetics", index: "+6", tone: "up" as const, signal: "Growing share, stable conversion" },
  { cohort: "Wool outerwear", index: "—", tone: "neutral" as const, signal: "Insufficient peer sample" },
] as const;

const BENCHMARK_STATS = [
  ["Products in dataset", "12,400+"],
  ["Peer segments", "8"],
  ["Conversion signals", "Live"],
] as const;

const FIBERS = [
  ["Cotton", 36, "#d9cbb8"],
  ["Polyester", 28, "#7d9bb8"],
  ["Viscose", 13, "#9c7b8b"],
  ["Wool", 8, "#c4a574"],
  ["Other", 15, "#d4cdc4"],
] as const;

export function SalesPanel({
  children,
  className = "",
  caption,
  tone = "ivory",
}: {
  children: React.ReactNode;
  className?: string;
  caption?: string;
  tone?: "ivory" | "white" | "dark";
}) {
  const bg =
    tone === "dark" ? "bg-[var(--platform-primary)] text-white border-[#2a3d5c]" : tone === "white" ? "bg-white" : "bg-[#f7f5f1]";
  return (
    <figure className={`m-0 ${className}`}>
      <div
        className={`rounded-xl border border-[#e8e3da] overflow-hidden shadow-[0_20px_50px_rgba(22,21,19,0.05)] ${bg}`}
      >
        {children}
      </div>
      {caption ? <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">{caption}</figcaption> : null}
    </figure>
  );
}

function SourcePill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "alert" | "ok" }) {
  const cls =
    tone === "alert"
      ? "bg-[#f3e6e6] text-[#8b2e2e]"
      : tone === "ok"
        ? "bg-[var(--platform-highlight)] text-[var(--platform-primary)]"
        : "bg-[#f0ebe4] text-[#5c5854]";
  return <span className={`inline-block text-[11px] px-2 py-1 ${cls}`}>{children}</span>;
}

/** Governed record — sources, conflict detection, approved value. */
export function GovernedRecordVisual() {
  return (
    <SalesPanel caption="Illustrative product record. INTERTEXE does not blindly overwrite source data.">
      <div className="p-5 sm:p-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)] gap-4 lg:gap-6 items-stretch">
          <div className="bg-white border border-[#e8e3da] p-4 sm:p-5">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-4">Incoming sources</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-[#8a847c] mb-1">Supplier feed</dt>
                <dd className="font-mono text-[12px]">98 COT / 2 EA</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-[#8a847c] mb-1">ERP export</dt>
                <dd className="font-mono text-[12px]">98% Cotton / 2% Elastane</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-[#8a847c] mb-1">Spreadsheet</dt>
                <dd className="font-mono text-[12px]">100% Cotton</dd>
              </div>
            </dl>
          </div>

          <div className="hidden lg:flex items-center justify-center text-[#9c7b8b]" aria-hidden>
            →
          </div>

          <div className="bg-[var(--platform-primary)] text-white p-4 sm:p-5 flex flex-col justify-center">
            <p className="text-[10px] tracking-[0.16em] uppercase text-white/50 mb-3">INTERTEXE resolution</p>
            <p className="text-sm font-light mb-3" style={SERIF}>
              Composition conflict detected
            </p>
            <ul className="text-xs text-white/75 space-y-2 leading-relaxed">
              <li>Source values preserved</li>
              <li>Confidence & review state tracked</li>
              <li>Evidence attached for approval</li>
            </ul>
          </div>

          <div className="hidden lg:flex items-center justify-center text-[#9c7b8b]" aria-hidden>
            →
          </div>

          <div className="bg-white border border-[#e8e3da] p-4 sm:p-5">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-primary)] mb-4">Approved record</p>
            <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-2">Composition</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <SourcePill tone="ok">98% Cotton</SourcePill>
              <SourcePill tone="ok">2% Elastane</SourcePill>
            </div>
            <div className="space-y-2 text-xs text-[#5c5854] border-t border-[#eeeae4] pt-3">
              <p>
                <span className="text-[#8a847c]">Provenance ·</span> Label + ERP aligned
              </p>
              <p>
                <span className="text-[#8a847c]">Review ·</span> Approved by merchandising
              </p>
              <p>
                <span className="text-[#8a847c]">Version ·</span> v3 published
              </p>
            </div>
          </div>
        </div>
      </div>
    </SalesPanel>
  );
}

/** Intelligence centerpiece — Material Benchmark visual system. */
export function IntelligenceBenchmarkVisual() {
  return (
    <SalesPanel tone="dark" caption="Illustrative example · Peer medians from governed datasets — not fabricated competitor dumps.">
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-accent-muted)]">Material Benchmark</p>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {BENCHMARK_STATS.map(([label, value]) => (
              <div key={label} className="text-right">
                <p className="text-sm font-light tabular-nums text-white" style={SERIF}>
                  {value}
                </p>
                <p className="text-[10px] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4 lg:gap-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.16em] uppercase text-white/50 mb-5">Your brand vs peer median</p>
            <ul className="space-y-4">
              {PEERS.map(([metric, you, peer]) => {
                const youN = parseFloat(you);
                const peerN = parseFloat(peer);
                return (
                  <li key={metric}>
                    <div className="flex justify-between gap-2 text-xs mb-1.5 text-white/80">
                      <span>{metric}</span>
                      <span className="tabular-nums text-white/55 shrink-0">
                        {you} / {peer}
                      </span>
                    </div>
                    <div className="relative h-2 bg-white/10 rounded-sm overflow-hidden">
                      <span
                        className="absolute inset-y-0 left-0 bg-white/25"
                        style={{ width: `${Math.min(peerN, 100)}%` }}
                      />
                      <span
                        className="absolute inset-y-0 left-0 bg-[var(--platform-accent-muted)]"
                        style={{ width: `${Math.min(youN, 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/40 mt-5">
              Light = peer group · Accent = your brand
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-5 flex-1">
              <p className="text-[10px] tracking-[0.14em] uppercase text-white/50 mb-3">Conversion by material cohort</p>
              <ul className="space-y-3">
                {CONVERSION_COHORTS.map((row) => (
                  <li key={row.cohort} className="border-b border-white/8 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs text-white/80">{row.cohort}</span>
                      <span
                        className={`text-xs font-medium tabular-nums shrink-0 ${
                          row.tone === "up"
                            ? "text-[#9dd4b0]"
                            : row.tone === "down"
                              ? "text-[#e8a8a8]"
                              : "text-white/45"
                        }`}
                      >
                        {row.index}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/45">{row.signal}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-5">
              <p className="text-[10px] tracking-[0.14em] uppercase text-white/50 mb-1">Catalog readiness</p>
              <p className="text-3xl font-light tabular-nums text-white" style={SERIF}>
                62%
              </p>
              <p className="text-xs text-white/55 mt-1">Passport preparation status</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-4 items-center">
            <p className="text-[10px] tracking-[0.14em] uppercase text-white/50 mb-0">Material mix</p>
            <div className="flex h-2 flex-1 min-w-[120px] max-w-xs overflow-hidden rounded-sm" aria-hidden>
              {FIBERS.map(([name, pct, color]) => (
                <span key={name} style={{ width: `${pct}%`, background: color }} title={name} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/55">
              {FIBERS.slice(0, 4).map(([name, pct]) => (
                <li key={name}>
                  {name} {pct}%
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SalesPanel>
  );
}

/** DPP — single premium passport identity visual. */
export function PassportIdentityVisual() {
  return (
    <SalesPanel caption="Illustrative passport. Preparation status only — not EU certification or verified DPP provider approval.">
      <div className="p-5 sm:p-8 lg:p-10">
        <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-8 items-center max-w-3xl mx-auto">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b] mb-2">Digital Product Passport</p>
            <p className="text-2xl sm:text-3xl font-light mb-2" style={SERIF}>
              Silk Evening Dress
            </p>
            <p className="text-xs text-[#8a847c] mb-6 font-mono">INTX-ITX-4102 · Version 2 published</p>
            <ul className="space-y-3 text-sm text-[#5c5854]">
              <li className="flex justify-between gap-4 border-t border-[#eeeae4] pt-3">
                <span>Composition</span>
                <span className="text-right">92% Silk · 8% Elastane</span>
              </li>
              <li className="flex justify-between gap-4 border-t border-[#eeeae4] pt-3">
                <span>Manufacturing</span>
                <span>Portugal</span>
              </li>
              <li className="flex justify-between gap-4 border-t border-[#eeeae4] pt-3">
                <span>Public surfaces</span>
                <span className="text-right text-xs leading-snug">Site · passport · QR · product pages</span>
              </li>
              <li className="flex justify-between gap-4 border-t border-[#eeeae4] pt-3">
                <span>Regulatory readiness</span>
                <SourcePill tone="ok">Fields complete</SourcePill>
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-center text-center mx-auto">
            <div className="rounded-2xl border border-[#e8e3da] bg-white p-6 shadow-[0_12px_40px_rgba(22,21,19,0.06)]">
              <QrMark />
              <p className="font-mono text-[11px] mt-4 text-[#5c5854]">Scan · stable QR</p>
            </div>
          </div>
        </div>
      </div>
    </SalesPanel>
  );
}

/** Platform breadth — grouped module grid synced with enterprise nav + maturity. */
export function PlatformModuleGrid() {
  const groups = enterpriseModuleCatalogByGroup();
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {groups.map((group) => (
          <div key={group.id} className="border border-[#e8e3da] bg-[#f7f5f1] p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">{group.label}</p>
            <ul className="space-y-3">
              {group.modules.map((mod) => (
                <li key={mod.href || mod.label} className="pl-3 border-l-2 border-[var(--platform-accent)]/25">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm text-[#161513] leading-snug">{mod.label}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${MATURITY_BADGE[mod.state]}`}
                    >
                      {implementationLabel(mod.state)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a847c] leading-relaxed">{mod.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[#8a847c] leading-relaxed">{marketingMaturityFootnote()}.</p>
    </div>
  );
}

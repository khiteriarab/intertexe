import Link from "next/link";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";
import { QrMark, SERIF } from "./platform-ui";

const DATA_SOURCES = [
  "PLM / PIM",
  "ERP exports",
  "Spreadsheets",
  "Supplier files",
  "Product feeds",
] as const;

const JOURNEY_STEPS = [
  { n: "01", title: "Connect", copy: "Bring existing product data together." },
  { n: "02", title: "Normalize", copy: "Standardize fields, fibers and formats." },
  { n: "03", title: "Resolve", copy: "Surface gaps and conflicting values." },
  { n: "04", title: "Understand", copy: "Analyze your catalog and benchmark readiness." },
  { n: "05", title: "Publish", copy: "Turn approved data into governed outputs." },
] as const;

const PEERS = [
  ["Natural fiber share", "57%", "46%"],
  ["Synthetic share", "43%", "54%"],
  ["Complete material data", "81%", "69%"],
  ["Passport-ready", "62%", "48%"],
] as const;

const FIBERS = [
  ["Cotton", 36, "#d9cbb8"],
  ["Polyester", 28, "#7d9bb8"],
  ["Viscose", 13, "#9c7b8b"],
  ["Wool", 8, "#c4a574"],
  ["Other", 15, "#d4cdc4"],
] as const;

const MODULE_GROUPS = [
  {
    label: "Core",
    modules: ["Overview", "Products", "Issues", "Passports"],
  },
  {
    label: "Operations",
    modules: ["Workflows", "Suppliers", "Files", "Activity"],
  },
  {
    label: "Intelligence",
    modules: ["Benchmarking", "Regulations", "Analytics"],
  },
  {
    label: "System",
    modules: ["Integrations", "Developers", "Settings"],
  },
] as const;

const CONSUMER_SURFACES = [
  { label: "Shopping platform", href: "/shop", hint: "Material-first discovery" },
  { label: "iOS app", href: "/scanner", hint: "Scan labels in store" },
  { label: "Chrome extension", href: getChromeWebStoreUrl(), hint: "Compare while browsing", external: true },
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
    tone === "dark" ? "bg-[#152238] text-white border-[#2a3d5c]" : tone === "white" ? "bg-white" : "bg-[#f7f5f1]";
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

/** Fragmented sources → one governed record (single visual). */
export function ProblemConvergenceVisual() {
  return (
    <SalesPanel
      caption="Illustrative — INTERTEXE connects existing systems without replacing them."
      className="mt-10 sm:mt-14"
    >
      <div className="p-6 sm:p-10 lg:p-12">
        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-10 items-center">
          <div className="space-y-2.5">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">Fragmented inputs</p>
            {DATA_SOURCES.map((source) => (
              <div
                key={source}
                className="text-[11px] sm:text-xs tracking-[0.06em] uppercase text-[#5c5854] bg-white border border-[#e8e3da] px-4 py-3"
              >
                {source}
              </div>
            ))}
          </div>

          <div className="hidden lg:flex flex-col items-center gap-3 px-2" aria-hidden>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#3e6268]/50 to-transparent" />
            <div className="w-10 h-10 rounded-full border border-[#3e6268]/30 flex items-center justify-center text-[#3e6268]">
              →
            </div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#3e6268]/50 to-transparent" />
          </div>

          <div className="lg:hidden flex justify-center py-2 text-[#3e6268]" aria-hidden>
            ↓
          </div>

          <div className="bg-[#152238] text-white p-6 sm:p-8 relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              aria-hidden
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-24deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 15px)",
              }}
            />
            <div className="relative">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-3">INTERTEXE</p>
              <p className="text-xl sm:text-2xl font-light leading-snug mb-3" style={SERIF}>
                One governed product record
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                Accurate. Complete. Traceable. Source values preserved — canonical fields for intelligence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SalesPanel>
  );
}

/** Five-step journey — native horizontal flow. */
export function JourneyStepsVisual() {
  return (
    <div className="mt-10 sm:mt-14">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-px bg-[#e8e3da] border border-[#e8e3da] rounded-xl overflow-hidden">
        {JOURNEY_STEPS.map((step) => (
          <article key={step.n} className="bg-white p-6 sm:p-7 flex flex-col min-h-[168px]">
            <p className="text-[11px] tracking-[0.22em] uppercase text-[#9c7b8b] mb-3 tabular-nums">{step.n}</p>
            <h3 className="text-lg sm:text-xl font-light mb-2 text-[#161513]" style={SERIF}>
              {step.title}
            </h3>
            <p className="text-sm text-[#5c5854] leading-relaxed mt-auto">{step.copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SourcePill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "alert" | "ok" }) {
  const cls =
    tone === "alert"
      ? "bg-[#f3e6e6] text-[#8b2e2e]"
      : tone === "ok"
        ? "bg-[#e8eef4] text-[#152238]"
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

          <div className="bg-[#152238] text-white p-4 sm:p-5 flex flex-col justify-center">
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
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#152238] mb-4">Approved record</p>
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

/** Intelligence centerpiece — one composed visual system. */
export function IntelligenceBenchmarkVisual() {
  return (
    <SalesPanel tone="dark" caption="Illustrative example · Peer medians from governed datasets — not fabricated competitor dumps.">
      <div className="p-5 sm:p-8">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] gap-4 lg:gap-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.16em] uppercase text-white/50 mb-5">Your material position</p>
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
                        className="absolute inset-y-0 left-0 bg-[#9bb4c9]"
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
              <p className="text-[10px] tracking-[0.14em] uppercase text-white/50 mb-3">Material mix</p>
              <div className="flex h-2 overflow-hidden rounded-sm mb-3" aria-hidden>
                {FIBERS.map(([name, pct, color]) => (
                  <span key={name} style={{ width: `${pct}%`, background: color }} title={name} />
                ))}
              </div>
              <ul className="space-y-1 text-xs text-white/70">
                {FIBERS.slice(0, 4).map(([name, pct]) => (
                  <li key={name} className="flex justify-between">
                    <span>{name}</span>
                    <span className="tabular-nums">{pct}%</span>
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
                <span>Public identity</span>
                <span className="font-mono text-xs">/p/INTX-ITX-4102</span>
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

/** Consumer ↔ INTERTEXE ↔ Brands — one distinctive visual. */
export function ConsumerEcosystemVisual() {
  return (
    <SalesPanel className="mt-10 sm:mt-14">
      <div className="p-6 sm:p-10">
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-stretch">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">Consumers</p>
              <p className="text-lg font-light" style={SERIF}>
                Discover · Scan · Compare
              </p>
            </div>
            <ul className="space-y-2">
              {CONSUMER_SURFACES.map((surface) => (
                <li key={surface.label}>
                  {surface.external ? (
                    <a
                      href={surface.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-[#e8e3da] px-4 py-3 hover:border-[#3e6268]/40 transition-colors"
                    >
                      <p className="text-[10px] tracking-[0.12em] uppercase text-[#9c7b8b]">{surface.label}</p>
                      <p className="text-xs text-[#5c5854] mt-1">{surface.hint}</p>
                    </a>
                  ) : (
                    <Link
                      href={surface.href}
                      className="block bg-white border border-[#e8e3da] px-4 py-3 hover:border-[#3e6268]/40 transition-colors"
                    >
                      <p className="text-[10px] tracking-[0.12em] uppercase text-[#9c7b8b]">{surface.label}</p>
                      <p className="text-xs text-[#5c5854] mt-1">{surface.hint}</p>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center px-2" aria-hidden>
            <div className="w-px flex-1 min-h-[40px] bg-[#e8e3da]" />
            <div className="my-3 w-16 h-16 rounded-full bg-[#152238] text-white flex items-center justify-center text-[10px] tracking-[0.14em] uppercase text-center leading-tight px-2">
              INTERTEXE
            </div>
            <div className="w-px flex-1 min-h-[40px] bg-[#e8e3da]" />
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">Brands</p>
            <p className="text-lg font-light mb-4" style={SERIF}>
              Understand · Benchmark · Prepare · Publish
            </p>
            <div className="bg-[#152238] text-white p-5 sm:p-6">
              <p className="text-[10px] tracking-[0.14em] uppercase text-white/50 mb-3">Enterprise workspace</p>
              <ul className="text-xs text-white/75 space-y-2">
                <li>Governed product & material records</li>
                <li>Issues, benchmarking & readiness</li>
                <li>Digital Product Passport publication</li>
              </ul>
              <p className="text-[10px] text-white/40 mt-4 leading-relaxed">
                Future consumer signals · governed aggregate only · not live where not operational
              </p>
            </div>
          </div>
        </div>
      </div>
    </SalesPanel>
  );
}

/** Platform breadth — grouped module grid, no empty workspace frame. */
export function PlatformModuleGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {MODULE_GROUPS.map((group) => (
        <div key={group.label} className="border border-[#e8e3da] bg-[#f7f5f1] p-5 sm:p-6">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">{group.label}</p>
          <ul className="space-y-2">
            {group.modules.map((mod) => (
              <li
                key={mod}
                className="text-sm text-[#161513] pl-3 border-l-2 border-[#3e6268]/25 leading-snug"
              >
                {mod}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

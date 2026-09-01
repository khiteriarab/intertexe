import Link from "next/link";
import type { OrgOverviewData } from "../../../lib/enterprise/queries";
import type { PeerComparisonRow } from "../../../lib/enterprise/composition-benchmark";
import type { CatalogCompositionStats } from "../../../lib/enterprise/composition-benchmark";
import { padCount } from "../../../lib/enterprise/display-format";
import { ENT_NAV_ITEM_ICONS } from "./EnterpriseNavIcons";
import { EntDonutChart, EntRoundedBarChart, LIFECYCLE_COLORS } from "./EnterpriseCharts";
import { passportStateLabel } from "../../../lib/enterprise/issue-copy";

type KpiCard = {
  label: string;
  value: string;
  hint: string;
  href: string;
  tone: "petrol" | "forest" | "rose" | "gold" | "stone" | "blush";
  icon: keyof typeof ENT_NAV_ITEM_ICONS;
};

const KPI_TONES: Record<KpiCard["tone"], { bg: string; icon: string }> = {
  petrol: { bg: "bg-[rgba(62,98,104,0.1)]", icon: "text-[var(--ent-petrol-deep)]" },
  forest: { bg: "bg-[rgba(44,74,62,0.1)]", icon: "text-[var(--ent-forest)]" },
  rose: { bg: "bg-[rgba(158,74,90,0.1)]", icon: "text-[var(--ent-raspberry)]" },
  gold: { bg: "bg-[rgba(232,197,71,0.18)]", icon: "text-[#9a7b1a]" },
  stone: { bg: "bg-[rgba(184,176,166,0.22)]", icon: "text-[var(--ent-muted)]" },
  blush: { bg: "bg-[rgba(243,230,228,0.85)]", icon: "text-[var(--ent-petrol-deep)]" },
};

const MODULE_LINKS: Array<{
  href: string;
  label: string;
  description: string;
  icon: keyof typeof ENT_NAV_ITEM_ICONS;
  count?: (overview: OrgOverviewData) => number | string;
}> = [
  { href: "/workflows", label: "Workflows", description: "Stage owners, due dates, and team coordination", icon: "workflows" },
  { href: "/benchmarking", label: "Benchmarking", description: "Fiber mix and governed peer comparison", icon: "benchmarking" },
  { href: "/products", label: "Products", description: "Catalog, imports, field approval", icon: "products", count: (o) => o.productCount },
  { href: "/issues", label: "Issues", description: "Blocking findings and missing data", icon: "issues", count: (o) => o.issueCount },
  { href: "/passports", label: "Passports", description: "Publish and version DPPs", icon: "passports", count: (o) => o.readyCount + o.publishedCount },
  { href: "/regulations", label: "Regulations", description: "EU ESPR and market rules", icon: "regulations" },
  { href: "/analytics", label: "Analytics", description: "Readiness and compliance trends", icon: "analytics" },
  { href: "/suppliers", label: "Suppliers", description: "Evidence requests and partners", icon: "suppliers" },
  { href: "/activity", label: "Activity", description: "Audit trail across the org", icon: "activity" },
  { href: "/integrations", label: "Integrations", description: "PLM, ERP, and data pipes", icon: "integrations" },
];

export function EntKpiGrid({ overview, base }: { overview: OrgOverviewData; base: string }) {
  const total = overview.productCount;
  const readinessPct = total > 0 ? Math.round(((overview.readyCount + overview.publishedCount) / total) * 100) : 0;

  const cards: KpiCard[] = [
    {
      label: "Active products",
      value: padCount(total),
      hint: total > 0 ? "In catalog" : "Import to begin",
      href: `${base}/products`,
      tone: "petrol",
      icon: "products",
    },
    {
      label: "Published passports",
      value: padCount(overview.publishedCount || overview.passportCounts.published || 0),
      hint: "Live in market",
      href: `${base}/passports`,
      tone: "forest",
      icon: "passports",
    },
    {
      label: "Ready to publish",
      value: padCount(overview.readyCount),
      hint: "All requirements met",
      href: `${base}/passports`,
      tone: "gold",
      icon: "passports",
    },
    {
      label: "Open issues",
      value: padCount(overview.issueCount),
      hint: overview.issueCount > 0 ? "Needs review" : "Clear",
      href: `${base}/issues`,
      tone: overview.issueCount > 0 ? "rose" : "stone",
      icon: "issues",
    },
    {
      label: "Missing fields",
      value: padCount(overview.missingCount),
      hint: "Composition, origin, IDs",
      href: `${base}/issues`,
      tone: overview.missingCount > 0 ? "rose" : "stone",
      icon: "issues",
    },
    {
      label: "Catalog readiness",
      value: `${readinessPct}%`,
      hint: "Passport-ready share",
      href: `${base}/benchmarking`,
      tone: "blush",
      icon: "benchmarking",
    },
  ];

  return (
    <section className="mb-10 md:mb-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="ent-section-eyebrow">Platform snapshot</p>
          <h2 className="ent-section-title">Key metrics</h2>
        </div>
        <Link href={`${base}/analytics`} className="ent-link-subtle hidden sm:inline-flex">
          View analytics →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = ENT_NAV_ITEM_ICONS[card.icon];
          const tone = KPI_TONES[card.tone];
          return (
            <Link key={card.label} href={card.href} className="ent-kpi-card group">
              <span className={`ent-kpi-icon ${tone.bg} ${tone.icon}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="ent-kpi-label">{card.label}</p>
              <p className="ent-kpi-value">{card.value}</p>
              <p className="ent-kpi-hint">{card.hint}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function EntModuleShowcase({ overview, base }: { overview: OrgOverviewData; base: string }) {
  return (
    <section className="mb-10 md:mb-12">
      <div className="mb-6">
        <p className="ent-section-eyebrow">Workspace</p>
        <h2 className="ent-section-title">Explore the platform</h2>
        <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-2xl">
          Every module connects to your live catalog — import once, then work across compliance, publishing, and operations.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {MODULE_LINKS.map((mod) => {
          const Icon = ENT_NAV_ITEM_ICONS[mod.icon];
          const count = mod.count?.(overview);
          return (
            <Link key={mod.href} href={`${base}${mod.href}`} className="ent-module-card group">
              <div className="flex items-start justify-between gap-3">
                <span className="ent-module-icon">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {count != null ? (
                  <span className="ent-module-badge">{typeof count === "number" ? padCount(count) : count}</span>
                ) : null}
              </div>
              <p className="ent-module-title">{mod.label}</p>
              <p className="ent-module-desc">{mod.description}</p>
              <span className="ent-module-cta">Open module →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function EntOverviewBenchmarkTeaser({
  base,
  overview,
  stats,
  peerRows,
}: {
  base: string;
  overview: OrgOverviewData;
  stats: CatalogCompositionStats;
  peerRows: PeerComparisonRow[];
}) {
  if (overview.productCount === 0) return null;

  const highlights = peerRows
    .filter((row) => row.yours != null && row.status === "ok")
    .slice(0, 3);
  const governedCount = peerRows.filter((row) => row.status === "ok").length;

  return (
    <section className="mb-10 md:mb-12">
      <div className="ent-benchmark-teaser">
        <div className="relative z-[1] grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <p className="ent-section-eyebrow text-white/50">Material intelligence</p>
            <h2 className="ent-benchmark-teaser-title">How your catalog compares</h2>
            <p className="text-sm text-white/70 mt-3 max-w-xl leading-relaxed">
              Fiber mix, data completeness, and passport readiness — benchmarked against governed peer medians when
              available. No fabricated competitor data.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="ent-benchmark-stat">
                <p className="ent-benchmark-stat-value">{stats.naturalFiberShare ?? "—"}%</p>
                <p className="ent-benchmark-stat-label">Natural fibers</p>
              </div>
              <div className="ent-benchmark-stat">
                <p className="ent-benchmark-stat-value">{stats.syntheticShare ?? "—"}%</p>
                <p className="ent-benchmark-stat-label">Synthetic fibers</p>
              </div>
              <div className="ent-benchmark-stat">
                <p className="ent-benchmark-stat-value">{stats.compositionCoveragePct ?? 0}%</p>
                <p className="ent-benchmark-stat-label">Composition complete</p>
              </div>
              <div className="ent-benchmark-stat">
                <p className="ent-benchmark-stat-value">{stats.passportReadyPct ?? 0}%</p>
                <p className="ent-benchmark-stat-label">Passport-ready</p>
              </div>
            </div>
            <Link
              href={`${base}/benchmarking`}
              className="inline-flex mt-8 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold bg-white text-[var(--ent-charcoal)] hover:bg-[var(--ent-butter-soft)] transition-colors"
            >
              Open benchmarking →
            </Link>
          </div>

          <div className="ent-benchmark-teaser-panel">
            <p className="text-[10px] tracking-[0.14em] uppercase text-white/45 mb-4">Peer comparison</p>
            {highlights.length > 0 ? (
              <ul className="space-y-4">
                {highlights.map((row) => (
                  <li key={row.metricKey} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/75">{row.label}</span>
                    <div className="text-right">
                      <p className="ent-display text-xl text-white tabular-nums">{row.yours}%</p>
                      <p className="text-xs text-white/45 mt-0.5">
                        peers {row.peerMedian}% · {row.delta != null && row.delta > 0 ? "+" : ""}
                        {row.delta}%
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60 leading-relaxed">
                Governed peer medians appear here when approved benchmark datasets meet the sample threshold for your
                plan. Your catalog metrics above are already live.
              </p>
            )}
            {stats.fiberRows.length > 0 ? (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-[10px] tracking-[0.12em] uppercase text-white/40 mb-3">Top fibers</p>
                <div className="flex flex-wrap gap-2">
                  {stats.fiberRows.slice(0, 5).map((fiber) => (
                    <span key={fiber.fiberCode} className="ent-benchmark-fiber-chip">
                      {fiber.label} {fiber.sharePct}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-[11px] text-white/40 mt-5">
              {governedCount > 0
                ? `${governedCount} governed peer metrics available`
                : "Collecting governed peer benchmarks"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EntOverviewCharts({ overview }: { overview: OrgOverviewData }) {
  const total = overview.productCount;
  if (total === 0) return null;

  const lifecycleSegments = [
    { key: "published", label: passportStateLabel("published"), value: overview.productStateCounts.published || 0, color: LIFECYCLE_COLORS.published },
    { key: "ready", label: passportStateLabel("ready"), value: overview.productStateCounts.ready || 0, color: LIFECYCLE_COLORS.ready },
    { key: "review_required", label: passportStateLabel("review_required"), value: overview.productStateCounts.review_required || 0, color: LIFECYCLE_COLORS.review_required },
    { key: "incomplete", label: passportStateLabel("incomplete"), value: overview.productStateCounts.incomplete || 0, color: LIFECYCLE_COLORS.incomplete },
    { key: "update_required", label: passportStateLabel("update_required"), value: overview.productStateCounts.update_required || 0, color: LIFECYCLE_COLORS.update_required },
  ].filter((s) => s.value > 0);

  const readinessPct = Math.round(((overview.readyCount + overview.publishedCount) / total) * 100);

  return (
    <section className="mb-10 md:mb-12 grid lg:grid-cols-2 gap-5">
      <div className="ent-widget-card p-6 md:p-8">
        <p className="ent-section-eyebrow">Distribution</p>
        <h3 className="ent-widget-title">Passport lifecycle</h3>
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-8">
          <EntDonutChart
            segments={lifecycleSegments}
            centerValue={`${readinessPct}%`}
            centerLabel="Ready"
            size={180}
            strokeWidth={20}
            light
          />
          <ul className="flex-1 space-y-3 w-full">
            {lifecycleSegments.map((seg) => (
              <li key={seg.key} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2.5 text-[var(--ent-ink-soft)]">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                  {seg.label}
                </span>
                <span className="ent-display text-lg tabular-nums">{seg.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ent-widget-card p-6 md:p-8">
        <p className="ent-section-eyebrow">Volume</p>
        <h3 className="ent-widget-title">State breakdown</h3>
        <div className="mt-8">
          <EntRoundedBarChart
            rows={lifecycleSegments.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
            height={140}
          />
        </div>
      </div>
    </section>
  );
}

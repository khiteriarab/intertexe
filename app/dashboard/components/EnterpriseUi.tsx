import Link from "next/link";
import type { OrgOverviewData } from "../../../lib/enterprise/queries";
import { passportStateLabel } from "../../../lib/enterprise/issue-copy";
import {
  activityDateGroup,
  formatRelativeActivityTime,
  padCount,
  parseActivityFeedLine,
} from "../../../lib/enterprise/display-format";
import {
  EntPassportLifecycleChart,
  EntRoundedBarChart,
  LIFECYCLE_COLORS,
} from "./EnterpriseCharts";

/* ── Page chrome ── */

export function EntPageHeader({
  eyebrow,
  title,
  description,
  action,
  brandLine = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  brandLine?: boolean;
}) {
  return (
    <header className="mb-12 md:mb-16">
      {brandLine ? (
        <p className="ent-serif text-[13px] tracking-[0.28em] uppercase text-[var(--ent-petrol-deep)] mb-4">
          INTERTEXE
        </p>
      ) : null}
      {eyebrow && !brandLine ? (
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--ent-muted-light)] mb-3">{eyebrow}</p>
      ) : null}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="ent-heading text-[2.5rem] md:text-[3.25rem] lg:text-[3.75rem] leading-[1.05] text-[var(--ent-ink)]">
            {title}
          </h1>
          {description ? (
            <p className="text-[16px] leading-relaxed text-[var(--ent-muted)] mt-4 max-w-xl">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EntSurface({
  title,
  children,
  className = "",
  padding = "normal",
  variant = "card",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  padding?: "normal" | "large" | "none";
  variant?: "card" | "open" | "tint";
}) {
  const pad = padding === "large" ? "p-7 md:p-9" : padding === "none" ? "" : "p-5 md:p-7";
  const shell =
    variant === "open"
      ? ""
      : variant === "tint"
        ? "bg-[var(--ent-surface-muted)]/50 rounded-[var(--ent-radius-xl)]"
        : "bg-[var(--ent-surface)] rounded-[var(--ent-radius-xl)] shadow-[var(--ent-shadow-sm)] shadow-[var(--ent-shadow-inset)]";
  return (
    <section className={`${shell} ${pad} ${className}`}>
      {title ? (
        <h2 className="text-[12px] font-medium tracking-[0.1em] uppercase text-[var(--ent-muted-light)] mb-5">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function EntEmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="ent-zone ent-zone-blush ent-zone-glow relative overflow-hidden rounded-[var(--ent-radius-2xl)] px-8 py-14 md:px-12 md:py-18 shadow-[var(--ent-shadow-panel)]">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--ent-petrol-deep) 1px, transparent 1px), linear-gradient(90deg, var(--ent-petrol-deep) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />
      <div className="relative max-w-lg">
        <p className="ent-heading text-[2rem] md:text-[2.5rem] leading-tight text-[var(--ent-ink)]">{title}</p>
        <p className="text-[15px] leading-relaxed text-[var(--ent-muted)] mt-4">{body}</p>
        {ctaHref && ctaLabel ? (
          <Link href={ctaHref} className={`${entButtonClass} mt-8 inline-flex`}>
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/* ── Overview hero ── */

export function EntOverviewHero({ overview, orgName }: { overview: OrgOverviewData; orgName: string }) {
  const total = overview.productCount;
  const passportReady = overview.readyCount + overview.publishedCount;
  const readinessPct = total > 0 ? Math.round((passportReady / total) * 100) : 0;

  const lifecycleSegments = [
    { key: "published", label: passportStateLabel("published"), value: overview.productStateCounts.published || 0, color: LIFECYCLE_COLORS.published },
    { key: "ready", label: passportStateLabel("ready"), value: overview.productStateCounts.ready || 0, color: LIFECYCLE_COLORS.ready },
    { key: "review_required", label: passportStateLabel("review_required"), value: overview.productStateCounts.review_required || 0, color: LIFECYCLE_COLORS.review_required },
    { key: "incomplete", label: passportStateLabel("incomplete"), value: overview.productStateCounts.incomplete || 0, color: LIFECYCLE_COLORS.incomplete },
    { key: "update_required", label: passportStateLabel("update_required"), value: overview.productStateCounts.update_required || 0, color: LIFECYCLE_COLORS.update_required },
  ].filter((s) => s.value > 0 || total === 0);

  const barRows = lifecycleSegments.map((s) => ({ label: s.label, value: s.value, color: s.color }));

  return (
    <section className="mb-10 md:mb-12">
      <div className="mb-8 md:mb-10">
        <p className="ent-brand">INTERTEXE</p>
        <h1 className="ent-title text-[2rem] md:text-[2.75rem] text-[var(--ent-ink)] mt-3">
          Welcome in, <span className="text-[var(--ent-petrol-deep)]">{orgName.split(" ")[0]}</span>
        </h1>
        <div className="ent-page-meta mt-4">
          <span>
            <strong>{total}</strong> products
          </span>
          <span>
            <strong>{overview.publishedCount || overview.passportCounts.published || 0}</strong> published
          </span>
          <span>
            <strong>{overview.readyCount}</strong> ready
          </span>
          <span>
            <strong>{overview.issueCount}</strong> issues
          </span>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-[var(--ent-radius-2xl)] p-6 md:p-8 lg:p-10 ent-animate-in"
        style={{ background: "var(--ent-gradient-hero)" }}
      >
        <div
          className="absolute inset-0 opacity-45 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.18) 0%, transparent 60%)" }}
          aria-hidden
        />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-[10px] tracking-[0.14em] uppercase text-white/45">Passport intelligence</p>
            <p className="ent-title text-[1.5rem] md:text-[1.75rem] text-white mt-2 leading-tight">
              {total > 0 ? `${readinessPct}% of catalog passport-ready` : "Import your catalog to begin"}
            </p>
            <p className="text-sm text-white/65 mt-3 max-w-md leading-relaxed">
              {total > 0
                ? `${passportReady} products ready or published${overview.missingCount > 0 ? ` · ${overview.missingCount} missing fields` : ""}`
                : "Upload products, resolve issues, then publish digital passports."}
            </p>
            {total > 0 ? (
              <div className="mt-8 max-w-md">
                <EntRoundedBarChart rows={barRows} height={96} dark />
              </div>
            ) : null}
          </div>
          {total > 0 ? (
            <div className="relative flex justify-center lg:justify-end">
              <EntPassportLifecycleChart
                segments={lifecycleSegments}
                centerValue={`${readinessPct}%`}
                centerLabel="Ready"
                size={220}
                strokeWidth={24}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── Status pills ── */

const PASSPORT_PILL: Record<string, string> = {
  incomplete: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted)]",
  review_required: "bg-[#EDE8DF] text-[var(--ent-ink-soft)]",
  ready: "bg-[#E4EDEA] text-[var(--ent-forest)] ring-1 ring-[var(--ent-forest)]/10",
  published: "bg-[var(--ent-petrol-deep)] text-white shadow-sm",
  update_required: "bg-[var(--ent-raspberry-soft)] text-[var(--ent-raspberry)]",
  archived: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted-light)]",
};

export function EntPassportPill({ state }: { state: string | null | undefined }) {
  const key = String(state || "incomplete");
  const tone = PASSPORT_PILL[key] || PASSPORT_PILL.incomplete;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.02em] ${tone}`}>
      {passportStateLabel(state)}
    </span>
  );
}

export function EntIssuePill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "attention" | "blocking";
}) {
  const styles = {
    neutral: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted)]",
    attention: "bg-[var(--ent-raspberry-soft)] text-[var(--ent-raspberry)]",
    blocking: "bg-[var(--ent-raspberry)] text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${styles[tone]}`}>
      {label}
    </span>
  );
}

/* ── Attention queue ── */

export type EntAttentionItem = {
  label: string;
  count?: number;
  href: string;
  context?: string;
  emphasis?: boolean;
};

export function EntAttentionPanel({
  nextTitle,
  nextBody,
  nextHref,
  nextLabel,
  items,
}: {
  nextTitle: string;
  nextBody: string;
  nextHref: string;
  nextLabel: string;
  items: EntAttentionItem[];
}) {
  return (
    <section className="mb-12 md:mb-16">
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 md:gap-10 items-start">
        <div>
          <h2 className="ent-serif text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)]">Needs your attention</h2>
          {items.length === 0 ? (
            <p className="text-[15px] text-[var(--ent-muted)] mt-4 max-w-lg leading-relaxed">
              Nothing blocking right now. Review products or publish ready passports when you are set.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--ent-border)]">
              {items.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className={`group flex items-center justify-between gap-4 py-4 transition-colors hover:text-[var(--ent-petrol-deep)] ${
                      item.emphasis ? "text-[var(--ent-raspberry)]" : "text-[var(--ent-ink)]"
                    }`}
                  >
                    <div>
                      <p className="ent-heading text-base capitalize">{item.label}</p>
                      {item.context ? <p className="text-sm text-[var(--ent-muted)] mt-1">{item.context}</p> : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {item.count != null ? (
                        <span className="ent-display text-[1.75rem] leading-none tabular-nums">{padCount(item.count)}</span>
                      ) : null}
                      <span className="text-sm text-[var(--ent-petrol-deep)] group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ent-dark-panel p-6 md:p-8 lg:sticky lg:top-8">
          <p className="text-[10px] tracking-[0.14em] uppercase text-white/40 mb-2">Suggested next</p>
          <p className="ent-serif text-[1.45rem] text-white mb-3 leading-tight">{nextTitle}</p>
          <p className="text-sm text-white/60 leading-relaxed mb-8">{nextBody}</p>
          <Link
            href={nextHref}
            className="inline-flex w-full justify-center items-center rounded-[var(--ent-radius-lg)] px-5 py-3.5 text-sm font-medium bg-white text-[var(--ent-charcoal)] hover:bg-[var(--ent-butter-soft)] transition-colors"
          >
            {nextLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Activity feed ── */

function activityDotClass(headline: string): string {
  if (headline.startsWith("Published")) return "bg-[var(--ent-forest)]";
  if (headline.startsWith("Imported")) return "bg-[var(--ent-petrol)]";
  return "bg-[var(--ent-stone)]";
}

export function EntActivityFeed({
  items,
}: {
  items: Array<{ id: string; title: string; created_at: string }>;
}) {
  if (items.length === 0) {
    return (
      <section className="pt-4">
        <h2 className="ent-heading text-[1.85rem] md:text-[2.25rem] text-[var(--ent-ink)] mb-6">Recent activity</h2>
        <div className="ent-zone ent-zone-stone rounded-[var(--ent-radius-2xl)] px-8 py-10 shadow-[var(--ent-shadow-panel)]">
          <p className="text-sm text-[var(--ent-muted)]">No activity recorded yet.</p>
        </div>
      </section>
    );
  }

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const group = activityDateGroup(item.created_at);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  }
  const order: Array<"Today" | "Yesterday" | "Earlier"> = ["Today", "Yesterday", "Earlier"];

  return (
    <section className="pt-2">
      <h2 className="ent-serif text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)] mb-6 md:mb-8">Recent activity</h2>
      <div className="divide-y divide-[var(--ent-border)]">
          {order.map((group) => {
            const groupItems = grouped.get(group);
            if (!groupItems?.length) return null;
            return (
              <div key={group} className="relative py-6 first:pt-0">
                <p className="ent-heading text-xl text-[var(--ent-ink-soft)] mb-4">{group}</p>
                <ul className="relative pl-1">
                  <span className="ent-timeline-spine" aria-hidden />
                  {groupItems.slice(0, 5).map((item, index) => {
                    const { headline, detail } = parseActivityFeedLine(item.title);
                    const when = formatRelativeActivityTime(item.created_at);
                    return (
                      <li key={item.id} className={`relative pl-10 ${index < Math.min(groupItems.length, 5) - 1 ? "pb-6" : ""}`}>
                        <span
                          className={`absolute left-0 top-1.5 h-6 w-6 rounded-full border-2 border-white shadow-sm ${activityDotClass(headline)}`}
                          aria-hidden
                        />
                        <div className="py-3 md:py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <p className="text-[16px] md:text-[17px] font-medium text-[var(--ent-ink)]">{headline}</p>
                            {when ? (
                              <time className="text-xs text-[var(--ent-muted-light)]" dateTime={item.created_at}>
                                {when}
                              </time>
                            ) : null}
                          </div>
                          {detail ? (
                            <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">{detail}</p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
      </div>
    </section>
  );
}

/* ── Legacy exports (used by other pages) ── */

export function EntMetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string; accent?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-6 py-6 border-y border-[var(--ent-border)]">
      {items.map((item, index) => (
        <div key={item.label} className={index === 0 ? "min-w-[8rem]" : ""}>
          <p className="ent-display text-[2.5rem] leading-none text-[var(--ent-ink)]">{item.value}</p>
          <p className="text-[12px] text-[var(--ent-muted)] mt-2">{item.label}</p>
          {item.hint ? <p className="text-xs text-[var(--ent-muted-light)] mt-1">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function EntIntelligencePanel({ overview }: { overview: OrgOverviewData }) {
  return null;
}

export function EntPassportStatusPanel({
  productStateCounts,
}: {
  productStateCounts: Record<string, number>;
}) {
  const order = ["published", "ready", "review_required", "incomplete", "update_required", "archived"];
  return (
    <EntSurface title="Passport workflow" variant="open">
      <ul className="space-y-4">
        {order.map((state) => (
          <li key={state} className="flex items-center justify-between gap-4">
            <EntPassportPill state={state} />
            <span className="ent-display text-2xl tabular-nums text-[var(--ent-ink)]">{productStateCounts[state] || 0}</span>
          </li>
        ))}
      </ul>
    </EntSurface>
  );
}

/* ── Form controls ── */

export const entInputClass =
  "ent-input border border-[rgba(26,31,34,0.1)] rounded-[var(--ent-radius-lg)] px-4 py-2.5 text-[14px] bg-white text-[var(--ent-ink)] placeholder:text-[var(--ent-muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--ent-petrol)]/20 transition-shadow";

export const entSelectClass =
  "ent-select border border-[var(--ent-border-strong)] rounded-[var(--ent-radius-lg)] px-4 py-3 text-sm bg-white/90 text-[var(--ent-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ent-petrol)]/25 shadow-[var(--ent-shadow-sm)]";

export const entButtonClass =
  "inline-flex items-center justify-center text-[13px] font-semibold rounded-full px-5 py-2.5 bg-[var(--ent-petrol-deep)] text-white hover:bg-[var(--ent-forest)] transition-colors disabled:opacity-50";

export const entButtonGhostClass =
  "inline-flex items-center justify-center text-[14px] font-medium rounded-[var(--ent-radius-lg)] px-5 py-3 border border-[var(--ent-border-strong)] bg-white/80 text-[var(--ent-ink-soft)] hover:bg-white shadow-[var(--ent-shadow-sm)] transition-all";

export const entLinkClass =
  "text-[14px] font-medium text-[var(--ent-petrol-deep)] hover:text-[var(--ent-forest)] transition-colors inline-flex items-center gap-1";

/** Neutral product visual — material placeholder, no fabricated imagery. */
export function EntProductPlaceholder({ category }: { category?: string | null }) {
  void category;
  return <div className="ent-product-visual" aria-hidden />;
}

export const entMetaClass = "text-[11px] text-[var(--ent-muted-light)]";
export const entLabelClass = "text-[11px] tracking-[0.06em] uppercase text-[var(--ent-muted-light)]";
export const entSectionTitleClass = "text-[12px] font-medium tracking-[0.1em] uppercase text-[var(--ent-muted-light)] mb-5";

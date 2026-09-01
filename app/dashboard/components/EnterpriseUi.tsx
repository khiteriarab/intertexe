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
  EntStackedBarChart,
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
          <h1 className="ent-serif text-[2.5rem] md:text-[3.5rem] leading-[1.02] tracking-[-0.03em] text-[var(--ent-ink)]">
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
        <p className="ent-serif text-[2rem] md:text-[2.5rem] leading-tight text-[var(--ent-ink)]">{title}</p>
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

  const supporting = [
    { label: "Ready for passport", value: overview.readyCount },
    { label: "Published", value: overview.publishedCount || overview.passportCounts.published || 0 },
    { label: "Open issues", value: overview.issueCount },
  ];

  return (
    <section className="mb-10 md:mb-14">
      <div className="ent-zone ent-zone-blush ent-zone-glow rounded-[var(--ent-radius-3xl)] overflow-hidden shadow-[var(--ent-shadow-lg)]">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-0 items-stretch">
          <div className="px-8 py-10 md:px-12 md:py-14 lg:py-16 flex flex-col justify-between min-h-[380px]">
            <div>
              <p className="ent-serif text-[11px] tracking-[0.32em] uppercase text-[var(--ent-petrol-deep)]">INTERTEXE</p>
              <p className="text-[12px] tracking-[0.1em] uppercase text-[var(--ent-muted-light)] mt-3">{orgName}</p>
              <h1 className="ent-serif text-[2.75rem] md:text-[3.75rem] lg:text-[4.25rem] leading-[0.98] tracking-[-0.03em] text-[var(--ent-ink)] mt-8">
                Overview
              </h1>
              <p className="text-[16px] text-[var(--ent-muted)] mt-5 max-w-md leading-relaxed">
                Product and passport readiness across your catalog.
              </p>
            </div>

            <div className="mt-10 lg:mt-0">
              <p className={entLabelClass + " mb-3"}>Catalog size</p>
              <div className="flex items-end gap-4 flex-wrap">
                <p className="ent-display ent-serif text-[5rem] sm:text-[6rem] lg:text-[6.5rem] leading-[0.85] text-[var(--ent-ink)]">
                  {total}
                </p>
                <div className="pb-2 lg:pb-4">
                  <p className="text-lg text-[var(--ent-ink-soft)]">{total === 1 ? "Product" : "Products"}</p>
                  {total > 0 ? (
                    <p className="text-sm text-[var(--ent-muted)] mt-1">
                      {readinessPct}% passport-ready
                      {overview.missingCount > 0 ? ` · ${overview.missingCount} missing fields` : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--ent-muted)] mt-1">Import a catalog to begin.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-10">
                {supporting.map((item) => (
                  <div key={item.label} className="ent-panel-nested px-4 py-4">
                    <p className="ent-display text-[1.5rem] md:text-[1.65rem] leading-none tabular-nums text-[var(--ent-petrol-deep)]">
                      {item.value}
                    </p>
                    <p className="text-[11px] text-[var(--ent-muted)] mt-2 leading-snug">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative px-6 py-8 md:px-8 md:py-10 lg:py-12 flex flex-col justify-center min-h-[340px]"
            style={{ background: "var(--ent-gradient-hero)" }}
          >
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 90% 70% at 100% 0%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(44,74,62,0.35) 0%, transparent 50%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <p className="text-[10px] tracking-[0.16em] uppercase text-white/45 mb-2">Passport lifecycle</p>
              <p className="text-[15px] text-white/75 mb-6 max-w-[16rem] leading-relaxed">
                Distribution across passport states in your active catalog.
              </p>
              <div className="flex justify-center py-2">
                <EntPassportLifecycleChart
                  segments={lifecycleSegments}
                  centerValue={total > 0 ? `${readinessPct}%` : "—"}
                  centerLabel={total > 0 ? "Passport ready" : "No products"}
                  size={240}
                  strokeWidth={26}
                />
              </div>
              {total > 0 ? (
                <div className="mt-6 pt-5 border-t border-white/10">
                  <EntStackedBarChart
                    dark
                    tall
                    rows={lifecycleSegments.map((s) => ({
                      label: s.label,
                      value: s.value,
                      color: s.color,
                    }))}
                  />
                </div>
              ) : null}
            </div>
          </div>
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
      <div className="grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-start mb-8">
        <div>
          <h2 className="ent-serif text-[1.85rem] md:text-[2.25rem] text-[var(--ent-ink)]">Needs your attention</h2>
          <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-lg leading-relaxed">{nextBody}</p>
        </div>
        <Link href={nextHref} className={`${entButtonClass} shrink-0 self-start`}>
          {nextLabel}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="ent-zone ent-zone-stone rounded-[var(--ent-radius-2xl)] px-8 py-10 shadow-[var(--ent-shadow-panel)]">
          <p className="text-[15px] text-[var(--ent-muted)]">
            Nothing blocking right now. Review products or publish ready passports when you are set.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
          {items.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`group relative overflow-hidden rounded-[var(--ent-radius-2xl)] p-6 md:p-7 shadow-[var(--ent-shadow-sm)] transition-all hover:shadow-[var(--ent-shadow)] hover:-translate-y-0.5 ${
                item.emphasis
                  ? "ent-zone ent-zone-butter ring-1 ring-[var(--ent-raspberry)]/15"
                  : "ent-zone ent-zone-cream"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`ent-display ent-serif leading-none tabular-nums ${
                      item.emphasis ? "text-[var(--ent-raspberry)]" : "text-[var(--ent-petrol-deep)]"
                    }`}
                    style={{ fontSize: "2.75rem" }}
                  >
                    {item.count != null ? padCount(item.count) : "—"}
                  </p>
                  <p className="text-[16px] font-medium text-[var(--ent-ink)] mt-3 capitalize">{item.label}</p>
                  {item.context ? <p className="text-sm text-[var(--ent-muted)] mt-1.5">{item.context}</p> : null}
                </div>
                <span className="text-[var(--ent-muted-light)] group-hover:text-[var(--ent-petrol-deep)] transition-all text-xl mt-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-[11px] tracking-[0.1em] uppercase text-[var(--ent-muted-light)] mt-8">
        Suggested next · {nextTitle}
      </p>
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
        <h2 className="ent-serif text-[1.85rem] md:text-[2.25rem] text-[var(--ent-ink)] mb-6">Recent activity</h2>
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
      <h2 className="ent-serif text-[1.85rem] md:text-[2.25rem] text-[var(--ent-ink)] mb-8 md:mb-10">Recent activity</h2>
      <div className="ent-zone ent-zone-cream rounded-[var(--ent-radius-2xl)] px-6 py-8 md:px-10 md:py-10 shadow-[var(--ent-shadow-panel)]">
        <div className="space-y-12">
          {order.map((group) => {
            const groupItems = grouped.get(group);
            if (!groupItems?.length) return null;
            return (
              <div key={group} className="relative">
                <p className="ent-serif text-[1.25rem] text-[var(--ent-ink-soft)] mb-6">{group}</p>
                <ul className="relative pl-1">
                  <span className="ent-timeline-spine" aria-hidden />
                  {groupItems.map((item, index) => {
                    const { headline, detail } = parseActivityFeedLine(item.title);
                    const when = formatRelativeActivityTime(item.created_at);
                    return (
                      <li key={item.id} className={`relative pl-10 ${index < groupItems.length - 1 ? "pb-8" : ""}`}>
                        <span
                          className={`absolute left-0 top-1.5 h-6 w-6 rounded-full border-2 border-white shadow-sm ${activityDotClass(headline)}`}
                          aria-hidden
                        />
                        <div className="ent-panel-nested px-5 py-4 md:px-6 md:py-5">
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
          <p className="ent-display ent-serif text-[2.5rem] leading-none text-[var(--ent-ink)]">{item.value}</p>
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
            <span className="ent-serif text-2xl tabular-nums text-[var(--ent-ink)]">{productStateCounts[state] || 0}</span>
          </li>
        ))}
      </ul>
    </EntSurface>
  );
}

/* ── Form controls ── */

export const entInputClass =
  "border border-[var(--ent-border-strong)] rounded-xl px-4 py-3 text-sm bg-[var(--ent-surface)] text-[var(--ent-ink)] placeholder:text-[var(--ent-muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--ent-petrol)]/20 transition-shadow";

export const entButtonClass =
  "inline-flex items-center justify-center text-[14px] font-medium rounded-xl px-5 py-3 bg-[var(--ent-petrol-deep)] text-white hover:bg-[var(--ent-forest)] shadow-[var(--ent-shadow-sm)] transition-all hover:shadow-[var(--ent-shadow)] disabled:opacity-50";

export const entButtonGhostClass =
  "inline-flex items-center justify-center text-[14px] font-medium rounded-xl px-5 py-3 border border-[var(--ent-border-strong)] bg-transparent text-[var(--ent-ink-soft)] hover:bg-[var(--ent-surface-muted)] transition-colors";

export const entLinkClass =
  "text-[14px] font-medium text-[var(--ent-petrol-deep)] hover:text-[var(--ent-forest)] transition-colors inline-flex items-center gap-1";

/** Neutral product thumbnail placeholder — no fabricated imagery. */
export function EntProductPlaceholder({ category }: { category?: string | null }) {
  const label = String(category || "").trim();
  return (
    <div
      className="shrink-0 w-11 h-[3.25rem] rounded-md bg-[var(--ent-surface-muted)] border border-[var(--ent-border)] flex items-end overflow-hidden"
      aria-hidden={!label}
    >
      {label ? (
        <span className="px-1 pb-1 text-[8px] leading-tight text-[var(--ent-muted-light)] line-clamp-3">{label}</span>
      ) : null}
    </div>
  );
}

export const entMetaClass = "text-[11px] text-[var(--ent-muted-light)]";
export const entLabelClass = "text-[11px] tracking-[0.06em] uppercase text-[var(--ent-muted-light)]";
export const entSectionTitleClass = "text-[12px] font-medium tracking-[0.1em] uppercase text-[var(--ent-muted-light)] mb-5";

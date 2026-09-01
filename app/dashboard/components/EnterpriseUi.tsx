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
    <div className="relative overflow-hidden rounded-[var(--ent-radius-xl)] bg-[var(--ent-gradient-blush)] px-8 py-14 md:py-16">
      <div
        className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--ent-petrol-glow)] blur-2xl pointer-events-none"
        aria-hidden
      />
      <p className="ent-serif text-2xl md:text-3xl text-[var(--ent-ink)] relative">{title}</p>
      <p className="text-[15px] leading-relaxed text-[var(--ent-muted)] mt-3 max-w-md relative">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className={`${entButtonClass} mt-8 relative`}>
          {ctaLabel}
        </Link>
      ) : null}
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
    <section className="mb-14 md:mb-20">
      <div className="mb-10 md:mb-12">
        <p className="ent-serif text-[13px] tracking-[0.28em] uppercase text-[var(--ent-petrol-deep)]">INTERTEXE</p>
        <p className="text-[11px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mt-2">{orgName}</p>
        <h1 className="ent-serif text-[2.75rem] md:text-[4rem] leading-[1] tracking-[-0.03em] text-[var(--ent-ink)] mt-6">
          Overview
        </h1>
        <p className="text-[16px] text-[var(--ent-muted)] mt-4 max-w-lg">
          Product and passport status across your catalog.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-6 lg:gap-8 items-stretch">
        <div className="flex flex-col justify-between lg:min-h-[300px]">
          <div>
            <p className={entLabelClass + " mb-4"}>Catalog</p>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="ent-display ent-serif text-[5.5rem] sm:text-[6.5rem] lg:text-[7rem] leading-[0.9] text-[var(--ent-ink)]">
                {total}
              </p>
              <p className="text-base text-[var(--ent-muted)] pb-2 lg:pb-3">
                {total === 1 ? "Product" : "Products"}
              </p>
            </div>
            {total === 0 ? (
              <p className="text-sm text-[var(--ent-muted)] mt-5">Import a catalog to begin.</p>
            ) : (
              <p className="text-sm text-[var(--ent-muted)] mt-5">
                {readinessPct}% passport-ready
                {overview.missingCount > 0 ? ` · ${overview.missingCount} missing fields` : ""}
              </p>
            )}
          </div>

          <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-[var(--ent-border)] grid grid-cols-3 gap-4 md:gap-8">
            {supporting.map((item) => (
              <div key={item.label}>
                <p className="ent-display text-[1.35rem] md:text-[1.5rem] leading-none tabular-nums text-[var(--ent-ink-soft)]">
                  {item.value}
                </p>
                <p className="text-[11px] text-[var(--ent-muted-light)] mt-1.5 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative rounded-[var(--ent-radius-xl)] overflow-hidden px-5 py-6 md:px-7 md:py-8 flex flex-col lg:max-w-md lg:justify-self-end w-full"
          style={{ background: "var(--ent-gradient-hero)" }}
        >
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative flex-1 flex flex-col">
            <p className="text-[11px] tracking-[0.14em] uppercase text-white/50 mb-2">Passport lifecycle</p>
            <p className="text-[15px] text-white/80 mb-4 max-w-xs">
              How products are distributed across passport states.
            </p>
            <div className="flex-1 flex items-center justify-center py-1">
              <EntPassportLifecycleChart
                segments={lifecycleSegments}
                centerValue={total > 0 ? `${readinessPct}%` : "—"}
                centerLabel={total > 0 ? "Passport ready" : "No products"}
                size={220}
                strokeWidth={24}
              />
            </div>
            {total > 0 ? (
              <div className="mt-3 pt-3 border-t border-white/10 hidden sm:block">
                <EntStackedBarChart
                  dark
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
    <section className="mb-14 md:mb-16">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <h2 className="ent-serif text-[1.5rem] md:text-[1.75rem] text-[var(--ent-ink)]">Needs your attention</h2>
          <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-lg">{nextBody}</p>
        </div>
        <Link
          href={nextHref}
          className={`${entButtonClass} shrink-0 self-start lg:self-auto`}
        >
          {nextLabel}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-[15px] text-[var(--ent-muted)] py-6 border-t border-[var(--ent-border)]">
          Nothing blocking right now. Review products or publish ready passports when you are set.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--ent-border)]">
          {items.map((item) => (
            <li key={item.href + item.label}>
              <Link
                href={item.href}
                className="group flex items-center gap-4 md:gap-6 py-4 md:py-5 transition-colors hover:bg-[var(--ent-surface-muted)]/40 -mx-3 px-3 rounded-[var(--ent-radius-lg)]"
              >
                <span
                  className={`ent-display text-[1.75rem] md:text-[2rem] leading-none tabular-nums shrink-0 w-12 md:w-14 ${
                    item.emphasis ? "text-[var(--ent-petrol-deep)]" : "text-[var(--ent-ink-soft)]"
                  }`}
                >
                  {item.count != null ? padCount(item.count) : "—"}
                </span>
                <span
                  className={`mt-3 h-2 w-2 rounded-full shrink-0 ${
                    item.emphasis ? "bg-[var(--ent-raspberry)]" : "bg-[var(--ent-petrol)]"
                  }`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] md:text-[17px] font-medium text-[var(--ent-ink)] capitalize">
                    {item.label}
                  </p>
                  {item.context ? (
                    <p className="text-sm text-[var(--ent-muted)] mt-1">{item.context}</p>
                  ) : null}
                </div>
                <span className="text-[var(--ent-muted-light)] group-hover:text-[var(--ent-petrol-deep)] group-hover:translate-x-0.5 transition-all text-lg shrink-0">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] tracking-[0.08em] uppercase text-[var(--ent-muted-light)] mt-8 pt-6 border-t border-[var(--ent-border)]">
        Next · {nextTitle}
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
      <section className="pt-10 border-t border-[var(--ent-border)]">
        <h2 className="ent-serif text-[1.75rem] text-[var(--ent-ink)] mb-4">Recent activity</h2>
        <p className="text-sm text-[var(--ent-muted)]">No activity recorded yet.</p>
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
    <section className="pt-10 md:pt-14 border-t border-[var(--ent-border)]">
      <h2 className="ent-serif text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)] mb-8">Recent activity</h2>
      <div className="space-y-10">
        {order.map((group) => {
          const groupItems = grouped.get(group);
          if (!groupItems?.length) return null;
          return (
            <div key={group}>
              <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-5">{group}</p>
              <ul className="space-y-0">
                {groupItems.map((item, index) => {
                  const { headline, detail } = parseActivityFeedLine(item.title);
                  const when = formatRelativeActivityTime(item.created_at);
                  return (
                    <li
                      key={item.id}
                      className={`relative pl-8 pb-7 ${index === groupItems.length - 1 ? "pb-0" : ""}`}
                    >
                      {index < groupItems.length - 1 ? (
                        <span className="absolute left-[5px] top-2 bottom-0 w-px bg-[var(--ent-border)]" aria-hidden />
                      ) : null}
                      <span
                        className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${activityDotClass(headline)}`}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="text-[16px] font-medium text-[var(--ent-ink)]">{headline}</p>
                        {when ? (
                          <time className="text-xs text-[var(--ent-muted-light)]" dateTime={item.created_at}>
                            {when}
                          </time>
                        ) : null}
                      </div>
                      {detail ? (
                        <p className="text-sm text-[var(--ent-muted)] mt-1.5 leading-relaxed">{detail}</p>
                      ) : null}
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

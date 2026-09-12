import Link from "next/link";

export function HqPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        <h1 className="hq-display text-2xl md:text-[2rem] leading-tight">{title}</h1>
        {description ? <p className="text-sm text-[var(--hq-muted)] mt-2 max-w-2xl">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function HqCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`hq-card p-5 ${className}`}>
      {title ? <h2 className="text-sm font-medium mb-3 text-[var(--hq-ink)]">{title}</h2> : null}
      {children}
    </section>
  );
}

export function HqEmptyState({
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
    <div className="rounded-xl border border-dashed border-[var(--hq-border)] bg-[var(--hq-surface)]/70 px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-[var(--hq-muted)] mt-2 max-w-md mx-auto">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="inline-block mt-5 text-xs tracking-widest uppercase border border-[var(--hq-border)] px-4 py-2 rounded-md hover:bg-[var(--hq-primary)] hover:text-[var(--hq-surface)] transition-colors"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function HqMetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="hq-card p-4">
          <p className="hq-eyebrow">{item.label}</p>
          <p className="hq-metric-value text-2xl mt-2 tabular-nums">{item.value}</p>
          {item.hint ? <p className="text-xs text-[var(--hq-muted)] mt-1">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

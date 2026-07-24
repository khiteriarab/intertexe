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
        <h1 className="text-2xl md:text-[28px] font-medium tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-black/55 mt-2 max-w-2xl">{description}</p> : null}
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
    <section className={`bg-white border border-black/10 rounded-xl p-5 ${className}`}>
      {title ? <h2 className="text-sm font-medium mb-3">{title}</h2> : null}
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
    <div className="rounded-xl border border-dashed border-black/15 bg-white/70 px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-black/55 mt-2 max-w-md mx-auto">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="inline-block mt-5 text-xs tracking-widest uppercase border border-black/20 px-4 py-2 hover:bg-black hover:text-white transition-colors"
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
        <div key={item.label} className="bg-white border border-black/10 rounded-xl p-4">
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">{item.label}</p>
          <p className="text-2xl font-medium mt-2 tabular-nums">{item.value}</p>
          {item.hint ? <p className="text-xs text-black/45 mt-1">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import {
  EntEmptyState,
  EntPageHeader,
  entLabelClass,
  entLinkClass,
  entMetaClass,
} from "./EnterpriseUi";

export function EntModulePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <EntPageHeader brandLine title={title} description={description} />
      {children}
    </div>
  );
}

export function EntModuleMetrics({
  items,
}: {
  items: Array<{ label: string; value: string | number; hint?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 pb-10 border-b border-[var(--ent-border)]">
      {items.map((item) => (
        <div key={item.label}>
          <p className="ent-display text-[2rem] md:text-[2.25rem] leading-none text-[var(--ent-ink)] tabular-nums">
            {item.value}
          </p>
          <p className="text-sm text-[var(--ent-muted)] mt-2">{item.label}</p>
          {item.hint ? <p className={`${entMetaClass} mt-1`}>{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function EntModuleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 md:mb-14">
      <h2 className="ent-serif text-[1.5rem] md:text-[1.75rem] text-[var(--ent-ink)] mb-6">{title}</h2>
      {children}
    </section>
  );
}

export function EntModuleList({
  items,
}: {
  items: Array<{
    key: string;
    primary: string;
    secondary?: string;
    meta?: string;
    href?: string;
    trailing?: React.ReactNode;
  }>;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-[var(--ent-border)]">
      {items.map((item) => (
        <li key={item.key} className="py-5 md:py-6">
          {item.href ? (
            <Link href={item.href} className="group block">
              <EntModuleListRow item={item} linked />
            </Link>
          ) : (
            <EntModuleListRow item={item} />
          )}
        </li>
      ))}
    </ul>
  );
}

function EntModuleListRow({
  item,
  linked = false,
}: {
  item: { primary: string; secondary?: string; meta?: string; trailing?: React.ReactNode };
  linked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`text-[16px] font-medium ${linked ? "text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors" : "text-[var(--ent-ink)]"}`}>
          {item.primary}
        </p>
        {item.secondary ? <p className="text-sm text-[var(--ent-muted)] mt-1">{item.secondary}</p> : null}
        {item.meta ? <p className={`${entMetaClass} mt-1`}>{item.meta}</p> : null}
      </div>
      {item.trailing ? <div className="shrink-0">{item.trailing}</div> : null}
    </div>
  );
}

export function EntIntegrationState({ state }: { state: "connected" | "available" | "not_configured" }) {
  const styles = {
    connected: "bg-[#E4EDEA] text-[var(--ent-forest)]",
    available: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted)]",
    not_configured: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted-light)]",
  };
  const labels = { connected: "Connected", available: "Available", not_configured: "Not configured" };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}

export { EntEmptyState, entLabelClass, entLinkClass, entMetaClass };

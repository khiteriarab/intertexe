import Link from "next/link";
import type { ReactNode } from "react";
import { entButtonClass, entLinkClass } from "./EnterpriseUi";

export function EntOpsPageHeader({
  title,
  subtitle,
  action,
  meta,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="ent-opsmod-header">
      <div className="ent-opsmod-header-row">
        <div className="min-w-0">
          <div className="ent-opsmod-title-row">
            <h1 className="ent-serif ent-opsmod-title">{title}</h1>
            <span className="ent-opsmod-status-pill">Production</span>
          </div>
          {subtitle ? <p className="ent-opsmod-subtitle">{subtitle}</p> : null}
          {meta ? <div className="ent-opsmod-meta">{meta}</div> : null}
        </div>
        {action ? <div className="ent-opsmod-header-action shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function EntOpsKpiRow({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    value: string | number;
    hint?: string;
    trend?: string | null;
    icon?: string;
    href?: string;
  }>;
}) {
  return (
    <div className="ent-opsmod-kpi-row">
      {items.map((item) => {
        const body = (
          <>
            {item.icon ? (
              <span className="ent-opsmod-kpi-icon" aria-hidden>
                {item.icon}
              </span>
            ) : null}
            <p className="ent-opsmod-kpi-value">{item.value}</p>
            <p className="ent-opsmod-kpi-label">{item.label}</p>
            {item.hint ? <p className="ent-opsmod-kpi-hint">{item.hint}</p> : null}
            {item.trend ? <p className="ent-opsmod-kpi-trend">{item.trend}</p> : null}
          </>
        );
        return item.href ? (
          <Link key={item.id} href={item.href} className="ent-opsmod-kpi-card">
            {body}
          </Link>
        ) : (
          <article key={item.id} className="ent-opsmod-kpi-card">
            {body}
          </article>
        );
      })}
    </div>
  );
}

export function EntOpsPanel({
  title,
  subtitle,
  action,
  children,
  accent = false,
  className = "",
  id,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  accent?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`ent-opsmod-panel ${accent ? "ent-opsmod-panel--accent" : ""} ${className}`}>
      {title ? (
        <div className="ent-opsmod-panel-head">
          <div>
            <h2 className="ent-serif ent-opsmod-panel-title">{title}</h2>
            {subtitle ? <p className="ent-opsmod-panel-sub">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EntOpsStatusPill({
  tone,
  children,
}: {
  tone: "complete" | "active" | "queued" | "approved" | "open" | "review" | "neutral";
  children: ReactNode;
}) {
  return <span className={`ent-opsmod-pill ent-opsmod-pill--${tone}`}>{children}</span>;
}

export function EntOpsEmptyState({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: string;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="ent-opsmod-empty">
      <span className="ent-opsmod-empty-icon" aria-hidden>
        {icon}
      </span>
      <p className="ent-opsmod-empty-title">{title}</p>
      <p className="ent-opsmod-empty-body">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className={entLinkClass}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function EntOpsPrimaryButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${entButtonClass} ent-opsmod-btn-primary`}>
      {children}
    </Link>
  );
}

export function EntOpsSecondaryButton({
  href,
  children,
  onClick,
}: {
  href?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link href={href} className="ent-opsmod-btn-secondary">
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className="ent-opsmod-btn-secondary" onClick={onClick}>
      {children}
    </button>
  );
}

export function EntOpsMetaLine({ items }: { items: ReactNode[] }) {
  return (
    <p className="ent-opsmod-meta-line">
      {items.map((item, index) => (
        <span key={index}>
          {index > 0 ? <span className="ent-opsmod-meta-sep">·</span> : null}
          {item}
        </span>
      ))}
    </p>
  );
}

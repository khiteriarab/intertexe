import Link from "next/link";
import {
  EntEmptyState,
  EntPageHeader,
  entButtonClass,
  entLabelClass,
  entLinkClass,
  entMetaClass,
} from "./EnterpriseUi";

export type EntZoneTone = "blush" | "butter" | "cream" | "stone" | "petrol";

export function EntVisualZone({
  tone,
  glow = false,
  className = "",
  children,
}: {
  tone: EntZoneTone;
  glow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`ent-zone ent-zone-${tone} ${glow ? "ent-zone-glow" : ""} ${className}`}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function EntModulePage({
  title,
  description,
  children,
  zone,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  zone?: EntZoneTone;
}) {
  return (
    <div>
      {zone ? (
        <div className="ent-float-card px-7 py-10 md:px-10 md:py-12 mb-10 md:mb-12">
          <EntPageHeader brandLine title={title} description={description} />
        </div>
      ) : (
        <EntPageHeader brandLine title={title} description={description} />
      )}
      {children}
    </div>
  );
}

export function EntMetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="ent-float-card px-5 py-5 md:px-6 md:py-6">
      <p
        className={`ent-display leading-none tabular-nums ${accent ? "text-[var(--ent-petrol-deep)]" : "text-[var(--ent-ink)]"}`}
        style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
      >
        {value}
      </p>
      <p className="text-sm text-[var(--ent-muted)] mt-2">{label}</p>
      {hint ? <p className={`${entMetaClass} mt-1`}>{hint}</p> : null}
    </div>
  );
}

export function EntModuleMetrics({
  items,
}: {
  items: Array<{ label: string; value: string | number; hint?: string; accent?: boolean }>;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-12">
      {items.map((item) => (
        <EntMetricTile key={item.label} {...item} />
      ))}
    </div>
  );
}

export function EntVisualPanel({
  title,
  subtitle,
  tone = "cream",
  children,
  className = "",
  padding = "large",
}: {
  title?: string;
  subtitle?: string;
  tone?: EntZoneTone | "petrol";
  children: React.ReactNode;
  className?: string;
  padding?: "normal" | "large";
}) {
  const pad = padding === "large" ? "p-7 md:p-9 lg:p-10" : "p-5 md:p-7";
  const isPetrol = tone === "petrol";
  return (
    <section
      className={`relative overflow-hidden rounded-[var(--ent-radius-2xl)] shadow-[var(--ent-shadow-panel)] ${pad} ${className} ${
        isPetrol ? "text-white" : ""
      } ${!isPetrol ? `ent-zone ent-zone-${tone}` : ""}`}
      style={isPetrol ? { background: "var(--ent-gradient-hero)" } : undefined}
    >
      {title ? (
        <div className="mb-6 md:mb-8 relative">
            <h2 className={`ent-heading text-[1.65rem] md:text-[2rem] leading-tight ${isPetrol ? "text-white" : "text-[var(--ent-ink)]"}`}>
            {title}
          </h2>
          {subtitle ? (
            <p className={`text-sm mt-2 max-w-md ${isPetrol ? "text-white/65" : "text-[var(--ent-muted)]"}`}>{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}

export function EntModuleSection({
  title,
  children,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="mb-12 md:mb-14">
      <div className="mb-6 md:mb-8">
        <h2 className="ent-heading text-[1.65rem] md:text-[2rem] text-[var(--ent-ink)]">{title}</h2>
        {subtitle ? <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-xl">{subtitle}</p> : null}
      </div>
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
    <ul className="grid sm:grid-cols-2 gap-4">
      {items.map((item) => (
        <li key={item.key} className="ent-float-card p-5 md:p-6">
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
        <p
          className={`text-[17px] font-medium ${linked ? "text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors" : "text-[var(--ent-ink)]"}`}
        >
          {item.primary}
        </p>
        {item.secondary ? <p className="text-sm text-[var(--ent-muted)] mt-1.5">{item.secondary}</p> : null}
        {item.meta ? <p className={`${entMetaClass} mt-1.5`}>{item.meta}</p> : null}
      </div>
      {item.trailing ? <div className="shrink-0">{item.trailing}</div> : null}
    </div>
  );
}

export function EntIntegrationTile({
  category,
  label,
  detail,
  state,
  href,
  featured = false,
}: {
  category: string;
  label: string;
  detail: string;
  state: "connected" | "available" | "not_configured";
  href?: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[var(--ent-radius-2xl)] p-6 md:p-8 min-h-[220px] flex flex-col justify-between shadow-[var(--ent-shadow-panel)] transition-transform hover:-translate-y-0.5 ${
        featured
          ? "text-white"
          : "bg-[var(--ent-gradient-warm)]"
      }`}
      style={featured ? { background: "var(--ent-gradient-hero)" } : undefined}
    >
      {!featured ? (
        <div
          className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--ent-petrol-glow) 0%, transparent 70%)" }}
          aria-hidden
        />
      ) : null}
      <div className="relative">
        <p className={`text-[10px] tracking-[0.14em] uppercase ${featured ? "text-white/50" : "text-[var(--ent-muted-light)]"}`}>
          {category}
        </p>
        <h3 className={`ent-heading text-[1.5rem] md:text-[1.75rem] mt-2 ${featured ? "text-white" : "text-[var(--ent-ink)]"}`}>
          {label}
        </h3>
        <p className={`text-sm mt-3 leading-relaxed max-w-xs ${featured ? "text-white/70" : "text-[var(--ent-muted)]"}`}>
          {detail}
        </p>
      </div>
      <div className="relative flex items-center justify-between gap-3 mt-8">
        <EntIntegrationState state={state} inverted={featured} />
        {href ? (
          <Link
            href={href}
            className={`text-sm font-medium ${featured ? "text-white/90 hover:text-white" : entLinkClass}`}
          >
            Open →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function EntIntegrationState({
  state,
  inverted = false,
}: {
  state: "connected" | "available" | "not_configured";
  inverted?: boolean;
}) {
  const styles = inverted
    ? {
        connected: "bg-white/20 text-white",
        available: "bg-white/10 text-white/80",
        not_configured: "bg-white/8 text-white/55",
      }
    : {
        connected: "bg-[#E4EDEA] text-[var(--ent-forest)]",
        available: "bg-white/80 text-[var(--ent-muted)] ring-1 ring-[var(--ent-border)]",
        not_configured: "bg-white/60 text-[var(--ent-muted-light)] ring-1 ring-[var(--ent-border)]",
      };
  const labels = { connected: "Connected", available: "Available", not_configured: "Not configured" };
  return (
    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-medium ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}

export function EntCodePanel({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="ent-code-panel px-5 py-4 md:px-6 md:py-5">
      <p className="text-[10px] tracking-[0.14em] uppercase text-white/45 mb-2">{label}</p>
      <p className={`text-sm break-all ${mono ? "font-mono" : ""} text-white/90`}>{value}</p>
    </div>
  );
}

export function EntRequirementCard({
  title,
  technicalKey,
  meta,
  severity,
}: {
  title: string;
  technicalKey?: string | null;
  meta?: string;
  severity?: string | null;
}) {
  const severityTone =
    severity === "blocking"
      ? "bg-[var(--ent-raspberry-soft)] text-[var(--ent-raspberry)]"
      : severity === "required"
        ? "bg-[#E4EDEA] text-[var(--ent-forest)]"
        : "bg-white/70 text-[var(--ent-muted)] ring-1 ring-[var(--ent-border)]";

  return (
    <article className="ent-panel-nested px-5 py-5 md:px-6 md:py-6 flex flex-col sm:flex-row sm:items-start gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[17px] font-medium text-[var(--ent-ink)]">{title}</p>
        {technicalKey ? <p className="font-mono text-[11px] text-[var(--ent-muted-light)] mt-1.5">{technicalKey}</p> : null}
        {meta ? <p className="text-sm text-[var(--ent-muted)] mt-2">{meta}</p> : null}
      </div>
      {severity ? (
        <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wide ${severityTone}`}>
          {severity.replaceAll("_", " ")}
        </span>
      ) : null}
    </article>
  );
}

export function EntIssueCompare({
  source,
  interpreted,
}: {
  source: string;
  interpreted: string;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3 mt-4">
      <div className="rounded-[var(--ent-radius-lg)] bg-[var(--ent-gradient-stone)] px-4 py-4 md:px-5 md:py-5">
        <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-2">Source evidence</p>
        <p className="text-[15px] text-[var(--ent-ink-soft)] leading-relaxed">{source || "—"}</p>
      </div>
      <div className="rounded-[var(--ent-radius-lg)] bg-[var(--ent-gradient-butter)] px-4 py-4 md:px-5 md:py-5 ring-1 ring-[var(--ent-border)]">
        <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-2">Interpreted value</p>
        <p className="text-[15px] font-medium text-[var(--ent-ink)] leading-relaxed">{interpreted || "—"}</p>
      </div>
    </div>
  );
}

export function EntHeroEmpty({
  title,
  body,
  ctaHref,
  ctaLabel,
  tone = "blush",
  motif = "grid",
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  tone?: EntZoneTone;
  motif?: "grid" | "rings";
}) {
  return (
    <EntVisualZone tone={tone} glow className="px-8 py-16 md:px-12 md:py-20 min-h-[320px] flex flex-col justify-center">
      {motif === "grid" ? (
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--ent-petrol-deep) 1px, transparent 1px), linear-gradient(90deg, var(--ent-petrol-deep) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
      ) : (
        <>
          <div className="absolute right-12 top-12 h-32 w-32 rounded-full border border-[var(--ent-petrol)]/10 pointer-events-none" aria-hidden />
          <div className="absolute right-24 top-24 h-48 w-48 rounded-full border border-[var(--ent-petrol)]/6 pointer-events-none" aria-hidden />
        </>
      )}
      <div className="relative max-w-lg">
        <p className="ent-heading text-[2rem] md:text-[2.75rem] leading-tight text-[var(--ent-ink)]">{title}</p>
        <p className="text-[15px] leading-relaxed text-[var(--ent-muted)] mt-4">{body}</p>
        {ctaHref && ctaLabel ? (
          <Link href={ctaHref} className={`${entButtonClass} mt-8 inline-flex`}>
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </EntVisualZone>
  );
}

export { EntEmptyState, entLabelClass, entLinkClass, entMetaClass };

import Image from "next/image";
import Link from "next/link";
import type { ConsumerPassportContent } from "../../../../lib/enterprise/public-passport-content";
import type { PassportExperienceConfig } from "../../../../lib/enterprise/passport-experience";
import "../../passport.css";

export type TemplateProps = {
  content: ConsumerPassportContent;
  experience: PassportExperienceConfig;
  publicId: string;
  versionNumber?: number;
  preview?: boolean;
  compact?: boolean;
};

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function PassportShell({
  content,
  experience,
  publicId,
  versionNumber,
  preview,
  compact,
  children,
}: TemplateProps & { children: React.ReactNode }) {
  const brand = experience.branding.brandDisplayName || content.brand || "INTERTEXE";
  const style = {
    "--pp-accent": experience.branding.accentColor || "#c4a574",
    "--pp-primary": experience.branding.primaryColor || "#3e6268",
  } as React.CSSProperties;

  return (
    <main
      className={`itx-passport ${compact ? "itx-passport--compact" : ""} ${
        experience.branding.fontPreset === "sans" ? "itx-passport--sans" : ""
      }`}
      style={style}
    >
      <div className="itx-passport-inner">
        {preview ? <p className="itx-passport-preview-badge">Preview — consumer experience</p> : null}

        <header className="mb-5 flex items-center gap-3">
          {experience.branding.logoUrl ? (
            <div className="relative h-8 w-24">
              <Image src={experience.branding.logoUrl} alt="" fill className="object-contain object-left" unoptimized />
            </div>
          ) : (
            <p className="itx-passport-brand">{brand}</p>
          )}
        </header>

        {children}

        {!preview && versionNumber ? (
          <p className="text-xs text-[var(--pp-muted-light,#9a948c)] mt-8">Version {versionNumber}</p>
        ) : null}

        {!preview ? (
          <Link
            href={`/p/${publicId}/json`}
            className="inline-block mt-6 text-[11px] tracking-[0.12em] uppercase"
            style={{ color: "var(--pp-accent)" }}
          >
            Machine-readable record →
          </Link>
        ) : null}

        <p className="text-center text-xs text-[var(--pp-muted-light,#9a948c)] mt-8 leading-relaxed">
          Powered by INTERTEXE · Governed product identity
        </p>
      </div>
    </main>
  );
}

export function ProductHero({ content, large = true }: { content: ConsumerPassportContent; large?: boolean }) {
  return (
    <div
      className={`itx-passport-hero-image ${large ? "" : "!max-h-[280px] !aspect-[4/3]"}`}
    >
      {content.imageUrl ? (
        <Image
          src={content.imageUrl}
          alt={content.productName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 640px"
          unoptimized
          priority
        />
      ) : null}
    </div>
  );
}

export function ProductTitleBlock({ content }: { content: ConsumerPassportContent }) {
  return (
    <div className="mt-5">
      {content.brand ? (
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--pp-muted-light,#9a948c)]">{content.brand}</p>
      ) : null}
      <h1 className="itx-passport-product-name">{content.productName}</h1>
      {content.identifier ? (
        <p className="font-mono text-[11px] text-[var(--pp-muted-light,#9a948c)] mt-2 break-all">{content.identifier}</p>
      ) : null}
    </div>
  );
}

export function MaterialsBlock({ content }: { content: ConsumerPassportContent }) {
  if (!content.composition) {
    return (
      <section className="itx-passport-section">
        <h2 className="itx-passport-section-title">Materials</h2>
        <p className="itx-passport-unavailable">Information not yet available</p>
      </section>
    );
  }
  return (
    <section className="itx-passport-section">
      <h2 className="itx-passport-section-title">Materials</h2>
      <p className="itx-passport-composition">{content.composition}</p>
      {content.materialBreakdown.length > 0 ? (
        <div className="itx-passport-chip-row">
          {content.materialBreakdown.map((row) => (
            <span key={row.fiber} className="itx-passport-chip">
              {row.fiber}
              {row.pct != null ? ` ${row.pct}%` : ""}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function JourneyBlock({ content }: { content: ConsumerPassportContent }) {
  const knownStages = content.journeyStages.filter((s) => s.status === "known");
  if (!knownStages.length) return null;
  return (
    <section className="itx-passport-section">
      <h2 className="itx-passport-section-title">Product journey</h2>
      <div className="itx-passport-journey">
        {content.journeyStages.map((stage) => (
          <div
            key={stage.id}
            className={`itx-passport-journey-stage ${
              stage.status === "unavailable" ? "itx-passport-journey-stage--unavailable" : ""
            }`}
          >
            <span className="itx-passport-journey-dot" aria-hidden />
            <p className="itx-passport-journey-eyebrow">{stage.eyebrow}</p>
            <p className="itx-passport-journey-title">
              {stage.status === "unavailable" ? "Information not yet available" : stage.title}
            </p>
            {stage.detail && stage.status === "known" ? (
              <p className="itx-passport-journey-detail">{stage.detail}</p>
            ) : null}
            {stage.location && stage.status === "known" ? (
              <p className="itx-passport-journey-location">{stage.location}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function CareBlock({ content }: { content: ConsumerPassportContent }) {
  return (
    <section className="itx-passport-section">
      <h2 className="itx-passport-section-title">Care & longevity</h2>
      {content.careInstructions?.length ? (
        <ul className="space-y-2 text-sm leading-relaxed">
          {content.careInstructions.map((line) => (
            <li key={line} className="flex gap-2">
              <span style={{ color: "var(--pp-accent)" }}>·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="itx-passport-unavailable">Information not yet available</p>
      )}
    </section>
  );
}

export function NextLifeBlock({ content }: { content: ConsumerPassportContent }) {
  return (
    <section className="itx-passport-section">
      <h2 className="itx-passport-section-title">Next life</h2>
      <p className="text-xs text-[var(--pp-muted,#6b6560)] mb-3">INTERTEXE guidance — not a brand-operated program unless verified.</p>
      <ul className="space-y-3">
        {content.nextLife.map((item) => (
          <li key={item.title} className="itx-passport-next-life">
            <p className="itx-passport-guidance-tag">Guidance</p>
            <p className="font-medium mt-1">{item.title}</p>
            <p className="text-sm text-[var(--pp-muted,#6b6560)] mt-1">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

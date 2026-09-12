import Image from "next/image";
import Link from "next/link";
import type { ConsumerPassportContent } from "../../../lib/enterprise/public-passport-content";
import "../passport.css";

function formatDate(iso: string | null): string | null {
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

export function ConsumerPassportPage({
  content,
  publicId,
  versionNumber,
  preview = false,
  compact = false,
}: {
  content: ConsumerPassportContent;
  publicId: string;
  versionNumber?: number;
  preview?: boolean;
  compact?: boolean;
}) {
  const knownStages = content.journeyStages.filter((s) => s.status === "known");

  return (
    <main className={`itx-passport ${compact ? "itx-passport--compact" : ""}`}>
      <div className="itx-passport-inner">
        {preview ? <p className="itx-passport-preview-badge">Preview — consumer view</p> : null}

        <header className="mb-6">
          <p className="itx-passport-brand">INTERTEXE</p>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--pp-muted-light,#9a948c)] mt-1">
            Digital Product Passport
          </p>
        </header>

        <div className="itx-passport-hero-image">
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

        <div className="mt-6">
          {content.brand ? (
            <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--pp-muted-light,#9a948c)]">
              {content.brand}
            </p>
          ) : null}
          <h1 className="itx-passport-product-name">{content.productName}</h1>

          <div className="itx-passport-chip-row mt-4">
            {content.category ? <span className="itx-passport-chip">{content.category}</span> : null}
            {content.color ? <span className="itx-passport-chip">{content.color}</span> : null}
            <span className="itx-passport-chip capitalize">{content.passportStatus.replace(/_/g, " ")}</span>
          </div>

          {content.identifier ? (
            <p className="font-mono text-[11px] text-[var(--pp-muted-light,#9a948c)] mt-3 break-all">
              {content.identifier}
            </p>
          ) : null}
        </div>

        {content.composition ? (
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
        ) : (
          <section className="itx-passport-section">
            <h2 className="itx-passport-section-title">Materials</h2>
            <p className="itx-passport-unavailable">Information not yet available</p>
          </section>
        )}

        <section className="itx-passport-section">
          <h2 className="itx-passport-section-title">Made</h2>
          {content.manufacturingCountry || content.manufacturer || content.facility ? (
            <dl className="space-y-2 text-sm">
              {content.manufacturer ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--pp-muted-light,#9a948c)]">
                    Manufacturer
                  </dt>
                  <dd>{content.manufacturer}</dd>
                </div>
              ) : null}
              {content.manufacturingCountry ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--pp-muted-light,#9a948c)]">
                    Country
                  </dt>
                  <dd>{content.manufacturingCountry}</dd>
                </div>
              ) : null}
              {content.facility ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--pp-muted-light,#9a948c)]">
                    Facility
                  </dt>
                  <dd>{content.facility}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="itx-passport-unavailable">Information not yet available</p>
          )}
        </section>

        <section className="itx-passport-section">
          <h2 className="itx-passport-section-title">Traceability</h2>
          <p className="text-sm text-[var(--pp-muted,#6b6560)] mb-4 leading-relaxed">
            Verified stages in this product&apos;s journey. Stages without data are omitted or marked unavailable.
          </p>

          <div className="itx-passport-journey md:hidden">
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
                {stage.imageUrl ? (
                  <div className="itx-passport-journey-product-thumb">
                    <Image src={stage.imageUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="itx-passport-journey-desktop hidden md:grid">
            {knownStages.map((stage) => (
              <div key={stage.id} className="itx-passport-journey-stage">
                <p className="itx-passport-journey-eyebrow">{stage.eyebrow}</p>
                <p className="itx-passport-journey-title">{stage.title}</p>
                {stage.location ? <p className="itx-passport-journey-location">{stage.location}</p> : null}
                {stage.imageUrl ? (
                  <div className="itx-passport-journey-product-thumb">
                    <Image src={stage.imageUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="itx-passport-section">
          <h2 className="itx-passport-section-title">Care & longevity</h2>
          {content.careInstructions?.length ? (
            <ul className="space-y-2 text-sm leading-relaxed text-[var(--pp-ink,#1a1f22)]">
              {content.careInstructions.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-[var(--pp-gold,#c4a574)]">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="itx-passport-unavailable">Information not yet available</p>
          )}
        </section>

        <section className="itx-passport-section">
          <h2 className="itx-passport-section-title">Next life</h2>
          <p className="text-xs text-[var(--pp-muted,#6b6560)] mb-4">
            INTERTEXE guidance — not a brand-operated program unless stated in verified data.
          </p>
          <ul className="space-y-4">
            {content.nextLife.map((item) => (
              <li key={item.title} className="itx-passport-next-life">
                <p className="itx-passport-guidance-tag">{item.kind === "program" ? "Brand program" : "Guidance"}</p>
                <p className="font-medium mt-1">{item.title}</p>
                <p className="text-sm text-[var(--pp-muted,#6b6560)] mt-1 leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {content.timeline.length > 0 ? (
          <section className="itx-passport-section">
            <h2 className="itx-passport-section-title">Passport history</h2>
            <ul className="itx-passport-timeline">
              {content.timeline.map((item) => (
                <li key={item.label}>
                  <strong className="text-[var(--pp-ink,#1a1f22)]">{item.label}</strong>
                  {item.date ? ` · ${formatDate(item.date)}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!preview && versionNumber ? (
          <p className="text-xs text-[var(--pp-muted-light,#9a948c)] mt-8">Version {versionNumber}</p>
        ) : null}

        {!preview ? (
          <Link
            href={`/p/${publicId}/json`}
            className="inline-block mt-6 text-[11px] tracking-[0.12em] uppercase text-[var(--pp-gold,#c4a574)] hover:text-[var(--pp-petrol-deep,#2c4a4e)]"
          >
            Machine-readable record →
          </Link>
        ) : null}

        <p className="text-center text-xs text-[var(--pp-muted-light,#9a948c)] mt-10 leading-relaxed">
          Governed material truth — verified by the brand and published through INTERTEXE.
        </p>
      </div>
    </main>
  );
}

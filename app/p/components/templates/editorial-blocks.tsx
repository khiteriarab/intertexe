import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ConsumerPassportContent } from "../../../../lib/enterprise/public-passport-content";
import type { PassportExperienceConfig } from "../../../../lib/enterprise/passport-experience";
import { SustainabilityBlock } from "./shared";

const JOURNEY_ICONS: Record<string, ReactNode> = {
  raw: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" />
      <path d="M12 10v4M10 12h4" />
    </svg>
  ),
  process: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" />
    </svg>
  ),
  fabric: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  manufacturing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 20h20M4 20V10l4-2v12M10 20V6l4-2v16M16 20V8l4-2v14" />
    </svg>
  ),
  product: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 3h12l2 4v14H4V7l2-4z" />
      <path d="M4 7h16M9 3v4M15 3v4" />
    </svg>
  ),
  "next-life": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 12a8 8 0 0113.5-5.7M20 12a8 8 0 01-13.5 5.7" />
      <path d="M17 3h3v3M7 21H4v-3" />
    </svg>
  ),
};

const CORE_JOURNEY_IDS = ["raw", "process", "fabric", "manufacturing", "product", "next-life"] as const;

function materialImageUrl(composition: string | null): string {
  const c = (composition || "").toLowerCase();
  if (c.includes("cotton")) return "/fabrics/fabric-cotton.jpg";
  if (c.includes("linen")) return "/fabrics/fabric-linen.jpg";
  if (c.includes("silk")) return "/fabrics/fabric-silk.jpg";
  if (c.includes("wool")) return "/fabrics/fabric-wool.jpg";
  if (c.includes("cashmere")) return "/fabrics/fabric-cashmere.jpg";
  if (c.includes("leather")) return "/fabrics/fabric-leather.jpg";
  return "/fabric-hero.jpg";
}

function fiberDescription(fiber: string): string {
  const f = fiber.toLowerCase();
  if (f.includes("cotton"))
    return "A natural fiber, valued for its breathability, softness and durability.";
  if (f.includes("linen"))
    return "A natural fiber from flax, valued for its strength, breathability and low environmental footprint.";
  if (f.includes("silk"))
    return "A natural protein fiber, valued for its lustre, drape and lightweight feel.";
  if (f.includes("wool"))
    return "A natural protein fiber, valued for warmth, resilience and moisture management.";
  if (f.includes("cashmere"))
    return "A luxury natural fiber, valued for exceptional softness and insulating warmth.";
  return "Material composition verified through the product passport record.";
}

function isNaturalFiber(composition: string | null): boolean {
  if (!composition) return false;
  return /cotton|linen|silk|wool|cashmere|hemp|jute|ramie|alpaca|mohair/i.test(composition);
}

function formatResaleRange(currency: string, low: number, high: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  return `${fmt(low)} – ${fmt(high)}`;
}

export function EditorialPassportHeader() {
  return (
    <header className="itx-pp-editorial-header">
      <div>
        <p className="itx-pp-editorial-logo">INTERTEXE</p>
        <p className="itx-pp-editorial-tagline">A more circular wardrobe</p>
      </div>
      <button type="button" className="itx-pp-editorial-menu" aria-label="Menu">
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}

export function EditorialProductHero({
  content,
  experience,
}: {
  content: ConsumerPassportContent;
  experience: PassportExperienceConfig;
}) {
  const brand = experience.branding.brandDisplayName || content.brand || "INTERTEXE";
  return (
    <div className="itx-pp-editorial-hero">
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
      <div className="itx-pp-editorial-hero-overlay">
        <div className="itx-pp-editorial-hero-top">
          <p className="itx-pp-editorial-hero-brand">{brand}</p>
          <p className="itx-pp-editorial-hero-eyebrow">Style lives longer</p>
        </div>
        <p className="itx-pp-editorial-hero-foot">Clothes for a brighter tomorrow</p>
      </div>
    </div>
  );
}

export function EditorialProductIntro({
  content,
  experience,
  publicId,
}: {
  content: ConsumerPassportContent;
  experience: PassportExperienceConfig;
  publicId: string;
}) {
  const brand = experience.branding.brandDisplayName || content.brand;
  const description =
    experience.branding.editorialCopy ||
    (content.composition
      ? `A ${content.composition.toLowerCase()} piece with verified composition and lifecycle data.`
      : null);

  return (
    <div className="itx-pp-editorial-intro">
      <h1 className="itx-pp-editorial-product-name">{content.productName}</h1>
      <p className="itx-pp-editorial-record-id">{content.identifier || publicId}</p>
      {description ? <p className="itx-pp-editorial-description">{description}</p> : null}
      <div className="itx-passport-chip-row">
        {brand ? <span className="itx-passport-chip">{brand}</span> : null}
        {content.category ? <span className="itx-passport-chip">{content.category}</span> : null}
      </div>
    </div>
  );
}

export function EditorialVerificationBadges({ content }: { content: ConsumerPassportContent }) {
  const verified = content.integrityStatus !== "conflict" && content.passportStatus === "published";
  const natural = isNaturalFiber(content.composition);

  const badges = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      title: "Verified product record",
      detail: verified
        ? "This product's details have been verified by INTERTEXE."
        : "Passport record under review.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" />
        </svg>
      ),
      title: natural ? "Natural fiber" : "Material profile",
      detail: natural
        ? `Made from ${content.composition?.toLowerCase() || "natural fibers"}.`
        : content.composition || "Composition recorded in passport.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
        </svg>
      ),
      title: "A more circular wardrobe",
      detail: "Greater transparency for a brighter tomorrow.",
    },
  ];

  return (
    <section className="itx-pp-editorial-badges" aria-label="Verification">
      {badges.map((b) => (
        <div key={b.title} className="itx-pp-editorial-badge">
          <div className="itx-pp-editorial-badge-icon">{b.icon}</div>
          <p className="itx-pp-editorial-badge-title">{b.title}</p>
          <p className="itx-pp-editorial-badge-detail">{b.detail}</p>
        </div>
      ))}
    </section>
  );
}

export function EditorialMissionStrip() {
  return (
    <section className="itx-pp-editorial-mission">
      <Image src="/fabric-hero.jpg" alt="" fill className="object-cover" sizes="640px" unoptimized />
      <div className="itx-pp-editorial-mission-copy">
        <p className="itx-pp-editorial-mission-title">Exceptional pieces live longer</p>
        <p className="itx-pp-editorial-mission-sub">People care. Clothes travel. A brighter tomorrow.</p>
      </div>
    </section>
  );
}

export function EditorialMaterialsCard({ content }: { content: ConsumerPassportContent }) {
  const primaryFiber = content.materialBreakdown[0]?.fiber || content.composition || "Materials";
  const pct = content.materialBreakdown[0]?.pct;

  return (
    <section className="itx-pp-editorial-card itx-pp-editorial-materials">
      <h2 className="itx-passport-section-title">Materials</h2>
      {content.composition ? (
        <>
          <p className="itx-pp-editorial-materials-headline">{content.composition}</p>
          <div className="itx-passport-chip-row">
            <span className="itx-passport-chip">
              {primaryFiber}
              {pct != null ? ` ${pct}%` : ""}
            </span>
          </div>
          <p className="itx-pp-editorial-materials-desc">{fiberDescription(primaryFiber)}</p>
          <div className="itx-pp-editorial-materials-visual">
            <div className="itx-pp-editorial-materials-image">
              <Image
                src={materialImageUrl(content.composition)}
                alt={primaryFiber}
                fill
                className="object-cover"
                sizes="120px"
                unoptimized
              />
            </div>
            <div className="itx-pp-editorial-materials-traits">
              {isNaturalFiber(content.composition) ? (
                <>
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" />
                    </svg>
                    Natural fiber
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
                    </svg>
                    Biodegradable
                  </span>
                </>
              ) : (
                <span>Composition verified in passport record</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="itx-passport-unavailable">Information not yet available</p>
      )}
    </section>
  );
}

export function EditorialJourneyTimeline({ content }: { content: ConsumerPassportContent }) {
  const stages = CORE_JOURNEY_IDS.map((id) => content.journeyStages.find((s) => s.id === id)).filter(Boolean);

  return (
    <section className="itx-pp-editorial-card itx-pp-editorial-journey">
      <div className="itx-pp-editorial-journey-head">
        <h2 className="itx-passport-section-title !mb-0">Product journey</h2>
        <span className="itx-pp-editorial-journey-meta">About this journey</span>
      </div>
      <div className="itx-pp-editorial-journey-track">
        {stages.map((stage) => {
          if (!stage) return null;
          const unavailable = stage.status === "unavailable";
          const label =
            stage.id === "manufacturing" && stage.location
              ? `${stage.title} · ${stage.location}`
              : stage.id === "product" && stage.detail
                ? `${stage.title} · ${stage.detail}`
                : unavailable
                  ? "Information coming soon"
                  : stage.title;

          return (
            <div
              key={stage.id}
              className={`itx-pp-editorial-journey-step ${unavailable ? "itx-pp-editorial-journey-step--pending" : ""}`}
            >
              <div className="itx-pp-editorial-journey-icon">{JOURNEY_ICONS[stage.id]}</div>
              <div className="itx-pp-editorial-journey-body">
                <p className="itx-passport-journey-eyebrow">{stage.eyebrow}</p>
                <p className="itx-pp-editorial-journey-label">{label}</p>
                {!unavailable && stage.location && stage.id !== "manufacturing" ? (
                  <p className="itx-passport-journey-location">{stage.location}</p>
                ) : null}
              </div>
              {stage.id === "manufacturing" && stage.location && !unavailable ? (
                <div className="itx-pp-editorial-journey-thumb">
                  <Image src="/platform/demo-see-it-live.jpg" alt="" fill className="object-cover" sizes="48px" unoptimized />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EditorialNextLifeCards({ content }: { content: ConsumerPassportContent }) {
  const valuation = content.resaleIntelligence;

  return (
    <section className="itx-pp-editorial-next-life">
      <div className="itx-pp-editorial-next-life-head">
        <h2 className="itx-passport-section-title !mb-0">Next life</h2>
        <p className="itx-pp-editorial-next-life-sub">Four ways to keep it in use</p>
      </div>
      {content.resaleEligible === false ? (
        <p className="itx-pp-editorial-resale-warning">
          Resale blocked — passport data conflict until reviewed.
        </p>
      ) : null}
      <ul className="itx-pp-editorial-next-life-list">
        {content.nextLife.map((item) => {
          const isPrimary = item.primary;
          const resaleEstimate =
            isPrimary && valuation && content.resaleEligible !== false
              ? formatResaleRange(valuation.currency, valuation.valueLow, valuation.valueHigh)
              : null;

          const inner = (
            <>
              <div className="itx-pp-editorial-next-life-icon" aria-hidden>
                {item.title.toLowerCase().includes("sell") ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                    <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                ) : item.title.toLowerCase().includes("repair") ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2 2-3.4-3.4 2-2z" />
                  </svg>
                ) : item.title.toLowerCase().includes("donate") ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 12a8 8 0 0113.5-5.7M20 12a8 8 0 01-13.5 5.7" />
                    <path d="M17 3h3v3M7 21H4v-3" />
                  </svg>
                )}
              </div>
              <div className="itx-pp-editorial-next-life-copy">
                {isPrimary ? <p className="itx-pp-editorial-next-life-primary-tag">Primary</p> : null}
                <p className="itx-pp-editorial-next-life-title">{item.title}</p>
                <p className="itx-pp-editorial-next-life-detail">{item.detail}</p>
                {resaleEstimate ? (
                  <p className="itx-pp-editorial-resale-estimate">Est. resale value {resaleEstimate}</p>
                ) : null}
              </div>
              <span className="itx-pp-editorial-next-life-chevron" aria-hidden>
                ›
              </span>
            </>
          );

          return (
            <li key={item.title}>
              {item.kind === "action" && item.href && !item.disabled ? (
                <Link href={item.href} className={`itx-pp-editorial-next-life-card ${isPrimary ? "is-primary" : ""}`}>
                  {inner}
                </Link>
              ) : (
                <div className={`itx-pp-editorial-next-life-card ${item.disabled ? "is-disabled" : ""}`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EditorialPassportFooter() {
  return (
    <footer className="itx-pp-editorial-footer">
      <div className="itx-pp-editorial-footer-banner">
        <Image src="/platform/demo-see-it-live.jpg" alt="" fill className="object-cover" sizes="640px" unoptimized />
        <p className="itx-pp-editorial-footer-quote">Greater transparency for a brighter tomorrow.</p>
      </div>
      <Link href="/platform" className="itx-pp-editorial-footer-cta">
        Learn more about INTERTEXE →
      </Link>
    </footer>
  );
}

export function EditorialScoresSection({ content }: { content: ConsumerPassportContent }) {
  return <SustainabilityBlock content={content} />;
}

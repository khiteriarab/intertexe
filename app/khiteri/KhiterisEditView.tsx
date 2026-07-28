import Link from "next/link";
import type { KhiterisEditConfig } from "../../lib/khiteris-edit";
import { KHITERIS_EDIT_ARCHIVE } from "../../lib/khiteris-edit";
import { AppDownloadBanner } from "../components/AppDownloadBanner";
import { KhiteriPageViewTracker } from "./KhiteriPageViewTracker";
import { KhiteriProductAffiliateLink } from "./KhiteriProductAffiliateLink";
import { KhiteriIntroMotion } from "./KhiteriIntroMotion";
import { KhiteriAirportOrbit } from "./KhiteriAirportOrbit";

const FINAL_NOTE = {
  lead: "Love finding better materials?",
  body: "INTERTEXE helps you discover what your clothes are actually made of.",
};

const BETA_COPY = {
  headline: "Join the INTERTEXE Beta",
  body: "Create a free account to access the beta and use the scanner to identify materials while shopping in-store.",
  primaryCta: "Create Account",
  secondaryCta: "Download the App",
};

const PIECE_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
] as const;

type Props = {
  edit: KhiterisEditConfig;
  appStoreUrl: string;
  /** Catalog region inferred from visitor IP (Vercel geo headers). */
  catalogRegion?: string;
};

export function KhiterisEditView({ edit, appStoreUrl, catalogRegion }: Props) {
  const pieceCount = edit.products.length;
  const pieceLabel = PIECE_WORDS[pieceCount] ?? String(pieceCount);

  return (
    <div className="khiteris-edit min-h-screen bg-[#F7F5F0] text-[#1a1a1a]" data-catalog-region={catalogRegion}>
      <AppDownloadBanner
        appStoreUrl={appStoreUrl}
        dismissKey="khiteri-app-banner-dismissed"
        message="Download the INTERTEXE app"
        testId="banner-khiteri-app-download"
      />
      <KhiteriIntroMotion />
      <KhiteriPageViewTracker editSlug={edit.slug} editMonth={edit.monthLabel} />
      <header className="khiteris-edit__masthead">
        <Link href="/" className="khiteris-edit__masthead-link" aria-label="INTERTEXE home">
          <img src="/khiteri/brand/intertexe-horizontal.png" alt="INTERTEXE" className="khiteris-edit__masthead-logo" />
        </Link>
      </header>

      {/* Section 1 — Cover */}
      <section className="khiteris-edit__cover khiteris-edit__cover--editorial" aria-label="Cover">
        <div className="khiteris-edit__cover-image">
          <img
            src={edit.coverImage.src}
            alt={edit.coverImage.alt}
            className="khiteris-edit__cover-img"
            loading="eager"
            fetchPriority="high"
            draggable={false}
          />
          <div className="khiteris-edit__cover-overlay">
            <p className="khiteris-edit__eyebrow khiteris-edit__eyebrow--on-media">Editorial</p>
            <h1 className="khiteris-edit__title khiteris-edit__title--on-media">{edit.title}</h1>
            <p className="khiteris-edit__month khiteris-edit__month--on-media">{edit.monthLabel}</p>
            {edit.subtitle ? (
              <p className="khiteris-edit__subtitle khiteris-edit__subtitle--on-media">{edit.subtitle}</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Section 2 — Editorial mood */}
      <section className="khiteris-edit__mood" aria-label="Editorial mood">
        <div className="khiteris-edit__mood-grid">
          {edit.moodBoard.images.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              className={`khiteris-edit__mood-cell khiteris-edit__mood-cell--${index}`}
            >
              <img src={image.src} alt={image.alt} loading="lazy" draggable={false} />
            </div>
          ))}
        </div>
        {edit.moodBoard.caption ? (
          <p className="khiteris-edit__mood-caption">{edit.moodBoard.caption}</p>
        ) : null}
      </section>

      {/* Section 3 — The Edit */}
      <section className="khiteris-edit__products" aria-label="The edit">
        <div className="khiteris-edit__section-intro">
          <p className="khiteris-edit__eyebrow">The Edit</p>
          <h2 className="khiteris-edit__section-title">{pieceLabel} pieces.</h2>
        </div>

        <ol className="khiteris-edit__product-list">
          {edit.products.map((product, index) => (
            <li
              key={product.id}
              className={`khiteris-edit__product${product.spotlight?.kind === "airport" ? " khiteris-edit__product--airport" : ""}`}
            >
              <span className="khiteris-edit__product-index" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              <KhiteriProductAffiliateLink
                product={product}
                editSlug={edit.slug}
                editMonth={edit.monthLabel}
                clickTarget="image"
                className="khiteris-edit__product-image khiteris-edit__product-link"
                ariaLabel={`Shop ${product.name} at ${product.brand}`}
              >
                <img
                  src={product.image.src}
                  alt={product.image.alt}
                  loading="lazy"
                  draggable={false}
                />
                {product.spotlight?.kind === "airport" ? (
                  <KhiteriAirportOrbit note={product.spotlight.note} />
                ) : null}
              </KhiteriProductAffiliateLink>
              <div className="khiteris-edit__product-meta">
                <p className="khiteris-edit__product-brand">{product.brand}</p>
                <h3 className="khiteris-edit__product-name">
                  <KhiteriProductAffiliateLink
                    product={product}
                    editSlug={edit.slug}
                    editMonth={edit.monthLabel}
                    clickTarget="title"
                    className="khiteris-edit__product-link khiteris-edit__product-name-link"
                  >
                    {product.name}
                  </KhiteriProductAffiliateLink>
                </h3>
                <p className="khiteris-edit__product-composition">{product.composition}</p>
                <p className="khiteris-edit__product-price">{product.price}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Section 4 — Final note */}
      <section className="khiteris-edit__note" aria-label="Closing note">
        <div className="khiteris-edit__divider" role="presentation" />
        <p className="khiteris-edit__note-lead">{FINAL_NOTE.lead}</p>
        <p className="khiteris-edit__note-body">{FINAL_NOTE.body}</p>
      </section>

      {/* Section 5 — Beta access */}
      <section className="khiteris-edit__beta" aria-label="Beta access">
        <h2 className="khiteris-edit__beta-headline">{BETA_COPY.headline}</h2>
        <p className="khiteris-edit__beta-body">{BETA_COPY.body}</p>
        <div className="khiteris-edit__beta-actions">
          <Link href="/account?mode=signup" className="khiteris-edit__cta khiteris-edit__cta--primary">
            {BETA_COPY.primaryCta}
          </Link>
          <a
            href={appStoreUrl}
            className="khiteris-edit__cta khiteris-edit__cta--secondary"
            rel="noopener noreferrer"
          >
            {BETA_COPY.secondaryCta}
          </a>
        </div>
      </section>

      <section className="khiteris-edit__archive" aria-label="Past postings">
        <h2 className="khiteris-edit__archive-title">Past postings</h2>
        <p className="khiteris-edit__archive-subtitle">Explore previous edits and keep building your collection.</p>
        <ul className="khiteris-edit__archive-list">
          {KHITERIS_EDIT_ARCHIVE.map((entry) => (
            <li key={entry.monthLabel} className="khiteris-edit__archive-item">
              <Link href={entry.href} className="khiteris-edit__archive-link">
                <span>{entry.monthLabel}</span>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="khiteris-edit__footer">
        <p className="khiteris-edit__footer-text">© INTERTEXE · {edit.monthLabel}</p>
      </footer>
    </div>
  );
}

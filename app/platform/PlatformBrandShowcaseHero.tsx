"use client";

import Image from "next/image";
import Link from "next/link";
import {
  PLATFORM_SHOWCASE_ROW_A,
  PLATFORM_SHOWCASE_ROW_B,
  PLATFORM_SHOWCASE_STATS,
  type ShowcaseTile,
} from "../../lib/enterprise/platform-brand-showcase";
import { PLATFORM_SALES_DEMO } from "../../lib/enterprise/passport-case-study";
import { SERIF } from "./platform-ui";

function ShowcaseTileCard({ tile, delayMs }: { tile: ShowcaseTile; delayMs: number }) {
  const style = { animationDelay: `${delayMs}ms` } as React.CSSProperties;

  if (tile.kind === "brand") {
    return (
      <div className="platform-showcase-tile platform-showcase-tile--brand" style={style}>
        <span className="platform-showcase-brand-label">{tile.brand}</span>
      </div>
    );
  }

  return (
    <div
      className={`platform-showcase-tile platform-showcase-tile--product ${tile.featured ? "platform-showcase-tile--featured" : ""}`}
      style={style}
      title={tile.name}
    >
      <div className="platform-showcase-tile-photo">
        <Image
          src={tile.imageUrl}
          alt={tile.name}
          fill
          className="object-contain p-1.5 scale-110"
          sizes={tile.featured ? "200px" : "160px"}
          unoptimized
        />
      </div>
      {tile.featured && tile.composition ? (
        <div className="platform-showcase-tile-meta">
          <span className="platform-showcase-tile-brand">{tile.brand}</span>
          <span className="platform-showcase-tile-comp">{tile.composition}</span>
          <span className="platform-showcase-tile-state">Verified</span>
        </div>
      ) : null}
    </div>
  );
}

function ShowcaseRow({ tiles, offset = 0 }: { tiles: ShowcaseTile[]; offset?: number }) {
  return (
    <div className={`platform-showcase-row ${offset ? "platform-showcase-row--offset" : ""}`}>
      {tiles.map((tile, index) => (
        <ShowcaseTileCard key={`${tile.kind}-${tile.id}-${index}`} tile={tile} delayMs={(index + offset) * 180} />
      ))}
    </div>
  );
}

export function PlatformBrandShowcaseHero() {
  return (
    <section className="platform-showcase-hero">
      <div className="platform-showcase-hero-bg" aria-hidden />
      <div className="platform-showcase-hero-inner">
        <div className="platform-showcase-hero-copy">
          <p className="platform-showcase-hero-eyebrow">INTERTEXE platform</p>
          <h1 className="platform-showcase-hero-title" style={SERIF}>
            One product record.
            <br />
            Every stage after.
          </h1>
          <p className="platform-showcase-hero-sub">
            INTERTEXE turns fragmented product, material, supplier and manufacturing data into one governed record built
            for traceability, Digital Product Passports, consumer experiences and resale.
          </p>
          <div className="platform-showcase-hero-actions">
            <Link href="/platform#how-it-works" className="platform-showcase-hero-cta">
              Explore the platform
              <span aria-hidden>→</span>
            </Link>
            <Link href="/platform/demo" className="platform-showcase-hero-cta-secondary">
              See it live
            </Link>
          </div>
        </div>

        <div className="platform-showcase-hero-stage">
          <aside className="platform-showcase-record" aria-label="Sample product record">
            <p className="platform-showcase-record-kicker">Product record</p>
            <p className="platform-showcase-record-name">
              {PLATFORM_SALES_DEMO.brand}
              <br />
              {PLATFORM_SALES_DEMO.productName}
            </p>
            <p className="platform-showcase-record-row">
              <span>Materials</span>
              <span>Verified</span>
            </p>
            <p className="platform-showcase-record-row">
              <span>Composition</span>
              <span>{PLATFORM_SALES_DEMO.composition}</span>
            </p>
            <p className="platform-showcase-record-row">
              <span>Traceability</span>
              <span>Ready</span>
            </p>
            <p className="platform-showcase-record-row">
              <span>Passport</span>
              <span>Ready</span>
            </p>
          </aside>

          <div className="platform-showcase-grid-wrap">
            <div className="platform-showcase-grid" aria-hidden>
              <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_A} />
              <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_B} offset={4} />
            </div>
          </div>
        </div>

        <div className="platform-showcase-stats">
          {PLATFORM_SHOWCASE_STATS.map((stat) => (
            <div key={stat.label} className="platform-showcase-stat">
              <p className="platform-showcase-stat-value" style={SERIF}>
                {stat.figure}
                <span className="sr-only"> {stat.qualifier}</span>
              </p>
              <p className="platform-showcase-stat-qualifier">{stat.qualifier}</p>
              <p className="platform-showcase-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  PLATFORM_SHOWCASE_ROW_A,
  PLATFORM_SHOWCASE_ROW_B,
  PLATFORM_SHOWCASE_STATS,
  type ShowcaseTile,
} from "../../lib/enterprise/platform-brand-showcase";
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
    <div className="platform-showcase-tile platform-showcase-tile--product" style={style} title={tile.name}>
      <Image
        src={tile.imageUrl}
        alt={tile.name}
        fill
        className="object-contain p-3"
        sizes="120px"
        unoptimized
      />
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
            Transforming how fashion teams connect product data to the customer experience.
          </h1>
          <p className="platform-showcase-hero-sub">
            From material origin to digital passport, care, resale, and next life — one governed record for compliance,
            transparency, and circular commerce.
          </p>
          <Link href="/platform/request?intent=snapshot&cta=request_demo" className="platform-showcase-hero-cta">
            Request a demo
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="platform-showcase-grid" aria-hidden>
          <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_A} />
          <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_B} offset={4} />
        </div>

        <div className="platform-showcase-stats">
          {PLATFORM_SHOWCASE_STATS.map((stat, index) => (
            <div key={stat.label} className="platform-showcase-stat">
              <p className="platform-showcase-stat-value">{stat.value}</p>
              <p className="platform-showcase-stat-label">{stat.label}</p>
              {index < PLATFORM_SHOWCASE_STATS.length - 1 ? (
                <span className="platform-showcase-stat-divider" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

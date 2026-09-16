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
        className="object-contain p-1.5 scale-110"
        sizes="160px"
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
            One product record. From conception to next life.
          </h1>
          <p className="platform-showcase-hero-sub">
            Turn fragmented product, material, supplier, and manufacturing data into one governed record that powers
            traceability, compliance, Digital Product Passports, consumer intelligence, care, and resale.
          </p>
          <Link href="/platform/demo" className="platform-showcase-hero-cta">
            See it live
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="platform-showcase-grid-wrap">
          <div className="platform-showcase-grid" aria-hidden>
            <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_A} />
            <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_B} offset={4} />
          </div>
        </div>

        <div className="platform-showcase-stats">
          {PLATFORM_SHOWCASE_STATS.map((stat) => (
            <div key={stat.label} className="platform-showcase-stat">
              <p className="platform-showcase-stat-value">
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

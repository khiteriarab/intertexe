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

type FlipMode = "composition" | "brand";

function ShowcaseTileCard({
  tile,
  delayMs,
  flipMode,
}: {
  tile: ShowcaseTile;
  delayMs: number;
  flipMode: FlipMode;
}) {
  const style = { animationDelay: `${delayMs}ms` } as React.CSSProperties;

  if (tile.kind === "brand") {
    return (
      <div className="platform-showcase-tile platform-showcase-tile--brand" style={style}>
        <span className="platform-showcase-brand-label">{tile.brand}</span>
      </div>
    );
  }

  const photo = (
    <Image
      src={tile.imageUrl}
      alt={tile.name}
      fill
      className="object-contain p-1.5 scale-110"
      sizes="160px"
      unoptimized
    />
  );

  // Bottom row: turn to brand name only — no composition line.
  if (flipMode === "brand") {
    return (
      <div className="platform-showcase-tile platform-showcase-tile--product" style={style} title={tile.name}>
        <div className="platform-showcase-flip" style={style}>
          <div className="platform-showcase-face platform-showcase-face--front">{photo}</div>
          <div className="platform-showcase-face platform-showcase-face--back platform-showcase-face--brand">
            <span className="platform-showcase-brand-label">{tile.brand}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!tile.composition) {
    return (
      <div className="platform-showcase-tile platform-showcase-tile--product" style={style} title={tile.name}>
        <div className="platform-showcase-tile-photo">{photo}</div>
      </div>
    );
  }

  // Top row: turn to composition + verified meta.
  return (
    <div className="platform-showcase-tile platform-showcase-tile--product" style={style} title={tile.name}>
      <div className="platform-showcase-flip" style={style}>
        <div className="platform-showcase-face platform-showcase-face--front">{photo}</div>
        <div className="platform-showcase-face platform-showcase-face--back">
          {photo}
          <div className="platform-showcase-tile-meta">
            <span className="platform-showcase-tile-brand">{tile.brand}</span>
            <span className="platform-showcase-tile-comp">{tile.composition}</span>
            <span className="platform-showcase-tile-state">Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseRow({
  tiles,
  offset = 0,
  flipMode,
}: {
  tiles: ShowcaseTile[];
  offset?: number;
  flipMode: FlipMode;
}) {
  return (
    <div className={`platform-showcase-row ${offset ? "platform-showcase-row--offset" : ""}`}>
      {tiles.map((tile, index) => (
        <ShowcaseTileCard
          key={`${tile.kind}-${tile.id}-${index}`}
          tile={tile}
          delayMs={(index + offset) * 180}
          flipMode={flipMode}
        />
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
            <Link href="/brands#how-it-works" className="platform-showcase-hero-cta">
              Explore the platform
              <span aria-hidden>→</span>
            </Link>
            <Link href="/brands/demo" className="platform-showcase-hero-cta-secondary">
              See it live
            </Link>
          </div>
        </div>

        <div className="platform-showcase-hero-stage">
          <div className="platform-showcase-grid-wrap">
            <div className="platform-showcase-grid" aria-hidden>
              <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_A} flipMode="composition" />
              <ShowcaseRow tiles={PLATFORM_SHOWCASE_ROW_B} offset={4} flipMode="brand" />
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

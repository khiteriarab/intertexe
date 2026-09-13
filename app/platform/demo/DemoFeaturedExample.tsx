"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { SERIF } from "../platform-ui";

const PASSPORT_TABS = ["Overview", "Materials", "Origin", "Impact", "Care", "Resale"] as const;

const TAB_COPY: Record<(typeof PASSPORT_TABS)[number], { title: string; body: string }> = {
  Overview: {
    title: "Material composition",
    body: DEMO_FEATURED.composition,
  },
  Materials: {
    title: "Fiber breakdown",
    body: "96% Silk · 4% Elastane · verified label evidence on file.",
  },
  Origin: {
    title: "Country of origin",
    body: `${DEMO_FEATURED.origin} · Supplier verified · Atelier Nord · Milan.`,
  },
  Impact: {
    title: "Environmental impact",
    body: "Impact fields tracked against DPP readiness — illustrative sample metrics.",
  },
  Care: {
    title: "Care instructions",
    body: "Dry clean only · Source retained from submitted product record.",
  },
  Resale: {
    title: "Resale potential",
    body: `${DEMO_FEATURED.resalePotential} · Next-life options attached to stable product identity.`,
  },
};

export function DemoFeaturedExample() {
  const [activeTab, setActiveTab] = useState<(typeof PASSPORT_TABS)[number]>("Overview");
  const tabCopy = TAB_COPY[activeTab];

  return (
    <section id="passport" className="demo-editorial-passport scroll-mt-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <div className="demo-editorial-passport-grid">
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-4">
              Explore a real example
            </p>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-light leading-[1.08] mb-4" style={SERIF}>
              {DEMO_FEATURED.name}
            </h2>
            <p className="text-[15px] sm:text-[16px] font-light leading-relaxed text-[var(--platform-muted)] mb-8 max-w-md">
              See how a single product record unlocks composition data, origin, impact insights, and next-life options
              — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link href={`/platform/api?gtin=${DEMO_FEATURED.gtin}`} className="demo-editorial-btn-primary">
                View full passport →
              </Link>
              <Link href="/platform/api" className="demo-editorial-btn-outline">
                Try another product
              </Link>
            </div>
            <div className="demo-editorial-passport-thumb">
              <img
                src={DEMO_FEATURED.image}
                alt={DEMO_FEATURED.name}
                width={120}
                height={150}
                className="demo-editorial-passport-thumb-image demo-editorial-passport-thumb-image--active"
              />
            </div>
          </div>

          <figure className="demo-editorial-passport-lifestyle m-0">
            <img
              src={DEMO_FEATURED.image}
              alt={`Model wearing ${DEMO_FEATURED.name}`}
              width={600}
              height={900}
              className="demo-editorial-passport-lifestyle-image"
            />
          </figure>

          <article className="demo-editorial-passport-card">
            <div className="demo-editorial-passport-card-header">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)]">
                Product passport (illustrative)
              </p>
              <span className="demo-editorial-passport-verified">Verified by INTERTEXE</span>
            </div>

            <div className="demo-editorial-passport-card-product">
              <img
                src={DEMO_FEATURED.image}
                alt=""
                width={120}
                height={150}
                className="demo-editorial-passport-card-product-image"
              />
              <div>
                <p className="text-base font-medium text-[var(--platform-ink)]" style={SERIF}>
                  {DEMO_FEATURED.name}
                </p>
                <p className="text-[11px] text-[var(--platform-muted)] mt-1">
                  INTERTEXE Sample · {DEMO_FEATURED.sku}
                </p>
              </div>
            </div>

            <div role="tablist" aria-label="Passport sections" className="demo-editorial-passport-tabs">
              {PASSPORT_TABS.map((tab) => {
                const selected = tab === activeTab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab)}
                    className={selected ? "is-active" : undefined}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="demo-editorial-passport-card-body">
              <div className="demo-editorial-passport-card-columns">
                <div>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-quiet)] mb-3">
                    {tabCopy.title}
                  </p>
                  {activeTab === "Overview" || activeTab === "Materials" ? (
                    <div className="demo-editorial-passport-bar">
                      <span style={{ width: "96%" }} />
                    </div>
                  ) : null}
                  <p className="text-sm text-[var(--platform-ink)] mb-5">{tabCopy.body}</p>
                </div>

                <dl className="demo-editorial-passport-facts">
                  <div>
                    <dt>Country of origin</dt>
                    <dd>{DEMO_FEATURED.origin}</dd>
                  </div>
                  <div>
                    <dt>Production details</dt>
                    <dd>Supplier verified</dd>
                  </div>
                  <div>
                    <dt>Care instructions</dt>
                    <dd>Dry clean only</dd>
                  </div>
                  <div>
                    <dt>Resale potential</dt>
                    <dd>{DEMO_FEATURED.resalePotential}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="demo-editorial-passport-card-footer">
              <span className="demo-editorial-passport-dpp">DPP Ready</span>
              <Link href={`/platform/api?gtin=${DEMO_FEATURED.gtin}`} className="demo-editorial-passport-share">
                Share
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

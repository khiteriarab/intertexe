"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import liveProducts from "../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { PASSPORT_CASE_STUDY, caseStudyPassportUrl } from "../../../lib/enterprise/passport-case-study";
import { PLATFORM_FEATURED_EXAMPLE_STYLES } from "../../../lib/enterprise/platform-brand-showcase";
import { getConsumerSiteUrl } from "../../../lib/platform-urls";
import { SERIF } from "../platform-ui";

type LiveProduct = (typeof liveProducts)[number];

const FEATURED_COPY =
  "Pick a garment, scan the QR, and open the same record in the workspace — composition, origin, impact, and next-life options in one place.";

/** Workspace Impact / Traceability screenshots shown beside each featured product image. */
const WORKSPACE_BY_STYLE: Record<string, string> = {
  "ITX-LIVE-07": "/platform/demo/workspace-cotton-poplin-shirt.png",
  "ITX-LIVE-01": "/platform/demo/workspace-gods-true-linen-shirt.png",
  "ITX-LIVE-09": "/platform/demo/workspace-upside-daria-miniskirt.png",
};

const DEFAULT_WORKSPACE = "/platform/demo/workspace-cotton-poplin-shirt.png";

/** Featured live HQ clothing starts with Ganni Cotton Poplin Shirt. */

function publicIdForStyle(style: string): string {
  if (style === PASSPORT_CASE_STUDY.styleCode) return PASSPORT_CASE_STUDY.publicId;
  const match = style.match(/^ITX-LIVE-(\d{1,2})$/i);
  const num = match ? String(Number(match[1])).padStart(2, "0") : "01";
  return `itxlive${num}`;
}

function passportPath(style: string): string {
  return `/p/${publicIdForStyle(style)}`;
}

function passportUrl(style: string): string {
  if (style === PASSPORT_CASE_STUDY.styleCode) return caseStudyPassportUrl();
  return `${getConsumerSiteUrl().replace(/\/$/, "")}${passportPath(style)}`;
}

function workspaceImageForStyle(style: string): string {
  return WORKSPACE_BY_STYLE[style] || DEFAULT_WORKSPACE;
}

export function DemoFeaturedExample() {
  const samples = useMemo(
    () =>
      PLATFORM_FEATURED_EXAMPLE_STYLES.map((style) => liveProducts.find((row) => row.style === style)).filter(
        (row): row is LiveProduct => Boolean(row),
      ),
    [],
  );
  const [selectedStyle, setSelectedStyle] = useState(samples[0]?.style || "ITX-LIVE-07");
  // Default featured record: Cotton Poplin Shirt
  const selected = samples.find((product) => product.style === selectedStyle) ?? samples[0];

  if (!selected) return null;

  const workspaceSrc = workspaceImageForStyle(selected.style);

  return (
    <section id="passport" className="demo-editorial-passport scroll-mt-24">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <div className="demo-editorial-passport-intro">
          <p className="demo-editorial-passport-eyebrow">See it live</p>
          <p className="demo-editorial-passport-steps" aria-hidden>
            <span>1 · Choose</span>
            <span>2 · Scan</span>
            <span>3 · Open the record</span>
          </p>
        </div>

        <div className="demo-editorial-passport-grid">
          <div className="demo-editorial-passport-copy">
            <h2 className="text-[2rem] sm:text-[2.5rem] font-light leading-[1.08] mb-4" style={SERIF}>
              {selected.name}
            </h2>
            <p className="text-[15px] sm:text-[16px] font-light leading-relaxed text-[var(--platform-muted)] mb-8 max-w-md">
              {FEATURED_COPY}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-8">
              <Link href={passportPath(selected.style)} className="demo-editorial-btn-primary">
                View full passport →
              </Link>
            </div>
            <div className="demo-editorial-passport-thumb" role="list" aria-label="Selected clothing records">
              {samples.map((product) => {
                const active = product.style === selected.style;
                return (
                  <button
                    key={product.style}
                    type="button"
                    role="listitem"
                    onClick={() => setSelectedStyle(product.style)}
                    aria-pressed={active}
                    aria-label={product.name}
                    className="demo-editorial-passport-thumb-btn"
                  >
                    <img
                      src={product.image_url}
                      alt=""
                      width={88}
                      height={110}
                      className={`demo-editorial-passport-thumb-image ${active ? "demo-editorial-passport-thumb-image--active" : ""}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <figure className="demo-editorial-passport-lifestyle m-0">
            <p className="demo-editorial-passport-caption">Physical product</p>
            <img
              src={selected.image_url}
              alt={selected.name}
              width={640}
              height={800}
              className="demo-editorial-passport-lifestyle-image"
            />
            <div className="demo-editorial-passport-qr">
              <QRCodeCanvas value={passportUrl(selected.style)} size={84} marginSize={1} />
            </div>
          </figure>

          <figure className="demo-editorial-passport-page m-0">
            <p className="demo-editorial-passport-caption">Workspace record</p>
            <img
              src={workspaceSrc}
              alt={`${selected.name} Impact workspace — climate, PEF score, and publish readiness`}
              width={1938}
              height={1290}
              className="demo-editorial-passport-page-image"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}

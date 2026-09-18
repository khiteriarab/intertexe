"use client";

import Image from "next/image";
import { useState } from "react";
import { DiscoverLink } from "../platform-ui";
import { LIFECYCLE_SLIDE_ASSETS } from "./lifecycle-slide-assets";

const SLIDES = [
  {
    id: "create" as const,
    index: "1",
    micro: "Input",
    label: "Create",
    title: "Capture and structure product data",
    copy: "Bring together product identity, composition, supplier inputs, specifications, and manufacturing details into one structured foundation.",
    bullets: [
      "Product identity",
      "Materials & composition",
      "Supplier + factory data",
      "Source files & specifications",
    ],
    foot: "From disconnected files to one usable data layer.",
    discoverHref: "/platform/demo#create",
  },
  {
    id: "verify" as const,
    index: "2",
    micro: "Validation",
    label: "Verify",
    title: "Find gaps before they become risk",
    copy: "Identify missing composition, incomplete traceability, unsupported claims, and supplier evidence gaps across the product record.",
    bullets: [
      "Missing composition",
      "Supplier evidence gaps",
      "Unsupported claims",
      "Incomplete manufacturing details",
    ],
    foot: "Turn fragmented product data into trusted product data.",
    discoverHref: "/platform/demo#verify",
  },
  {
    id: "comply" as const,
    index: "3",
    micro: "Compliance",
    label: "Comply",
    title: "Prepare products for trust and regulation",
    copy: "Turn approved product data into a governed record ready for Digital Product Passports, regulatory requirements, and controlled transparency.",
    bullets: [
      "Digital Product Passport ready",
      "Traceability structure",
      "Regulatory requirements",
      "Approved evidence layer",
    ],
    foot: "One governed record. Ready for regulation, audit, and consumer use.",
    discoverHref: "/platform/demo#comply",
  },
  {
    id: "distribute" as const,
    index: "4",
    micro: "Delivery",
    label: "Distribute",
    title: "One record, every channel",
    copy: "Publish product data through hosted passports, branded experiences, or API so every channel works from the same governed source.",
    bullets: ["Hosted passport", "Brand domain", "Headless API", "One record, every channel"],
    foot: "Infrastructure — not just a page builder.",
    discoverHref: "/platform/demo#distribute",
  },
  {
    id: "extend" as const,
    index: "5",
    micro: "Circularity",
    label: "Extend",
    title: "Support the product after the sale",
    copy: "Power scan-based care, repair, resale, transfer, and circular next-life experiences from the same product record.",
    bullets: ["Composition & origin", "Care & aftercare", "Repair guidance", "Resale & transfer"],
    foot: "From first sale to second life.",
    discoverHref: "/platform/demo#extend",
  },
] as const;

type SlideId = (typeof SLIDES)[number]["id"];

const SOFTWARE_ALTS: Record<SlideId, string> = {
  create: "INTERTEXE workspace overview — catalog readiness, products, and what to do next.",
  verify: "INTERTEXE issues inbox — missing fields, conflicts, and blocking publish findings.",
  comply: "INTERTEXE operations — from data to action, approvals, and passports ready to publish.",
  distribute: "Product record with CREATE, PROVE, MARKET, OWN, NEXT LIFE and a QR-ready passport.",
  extend: "INTERTEXE suppliers — evidence requests, linked products, and supplier collaboration.",
};

function StageGraphic({ slideId }: { slideId: SlideId }) {
  const softwareSrc = LIFECYCLE_SLIDE_ASSETS[slideId].softwareImage;
  if (!softwareSrc) return null;

  return (
    <div className={`platform-lifecycle-graphic platform-lifecycle-graphic--screenshot platform-lifecycle-graphic--${slideId}`}>
      <div className="platform-lifecycle-graphic-ui">
        <Image
          src={softwareSrc}
          alt={SOFTWARE_ALTS[slideId]}
          width={1138}
          height={706}
          className="platform-lifecycle-graphic-shot"
          sizes="(max-width: 767px) 92vw, 860px"
          priority
        />
      </div>
    </div>
  );
}

export function WhatItIsProcessVisual() {
  const [activeIndex, setActiveIndex] = useState(0);
  const item = SLIDES[activeIndex] ?? SLIDES[0];
  const panelId = "lifecycle-slide-panel";

  return (
    <div className="platform-lifecycle-journey">
      <div className="platform-what-slides-tabs" role="tablist" aria-label="How INTERTEXE works">
        {SLIDES.map((slide, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              id={`lifecycle-tab-${slide.id}`}
              className={`platform-what-slides-tab ${selected ? "is-active" : ""}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveIndex(index)}
            >
              <span className="platform-what-slides-tab-index">{slide.index.padStart(2, "0")}</span>
              {slide.label}
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`lifecycle-tab-${item.id}`}
        className="platform-lifecycle-journey-panel"
      >
        <StageGraphic slideId={item.id} />
        <div className="platform-lifecycle-journey-copy">
          <p className="platform-lifecycle-journey-kicker">
            {item.index.padStart(2, "0")} · {item.label}
          </p>
          <h3 className="platform-lifecycle-journey-title">{item.title}</h3>
          <p className="platform-lifecycle-journey-body">{item.copy}</p>
          <ul className="platform-lifecycle-journey-bullets">
            {item.bullets.map((bullet) => (
              <li key={bullet}>
                <span className="platform-lifecycle-journey-check" aria-hidden>
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <p className="platform-lifecycle-journey-foot">{item.foot}</p>
          <DiscoverLink href={item.discoverHref} className="platform-lifecycle-discover">
            Discover
          </DiscoverLink>
        </div>
      </div>
    </div>
  );
}

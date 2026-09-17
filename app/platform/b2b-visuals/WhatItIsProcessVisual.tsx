"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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

function StageGraphic({ slideId, isActive }: { slideId: SlideId; isActive: boolean }) {
  const softwareSrc = LIFECYCLE_SLIDE_ASSETS[slideId].softwareImage;

  return (
    <div className={`platform-lifecycle-graphic platform-lifecycle-graphic--screenshot platform-lifecycle-graphic--${slideId}`}>
      {softwareSrc ? (
        <div className="platform-lifecycle-graphic-ui">
          <Image
            src={softwareSrc}
            alt={SOFTWARE_ALTS[slideId]}
            width={152}
            height={152}
            className="platform-lifecycle-graphic-shot"
            sizes="68px"
            priority={isActive}
          />
        </div>
      ) : (
        <div className="platform-lifecycle-graphic-ui-slot" aria-hidden>
          <p className="platform-lifecycle-graphic-ui-slot-label">Workspace graphic</p>
          <p className="platform-lifecycle-graphic-ui-slot-note">Ready for stage artwork</p>
        </div>
      )}
    </div>
  );
}

export function WhatItIsProcessVisual() {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = SLIDES[activeIndex];

  const go = useCallback((index: number) => {
    setActiveIndex((index + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(activeIndex - 1);
      if (event.key === "ArrowRight") go(activeIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, go]);

  return (
    <div className="platform-lifecycle-journey">
      <div role="tablist" aria-label="Product lifecycle stages" className="platform-what-slides-tabs">
        {SLIDES.map((item, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`lifecycle-tab-${item.id}`}
              aria-selected={selected}
              aria-controls="lifecycle-slide-panel"
              onClick={() => go(index)}
              className={`platform-what-slides-tab ${selected ? "is-active" : ""}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        id="lifecycle-slide-panel"
        role="tabpanel"
        aria-labelledby={`lifecycle-tab-${slide.id}`}
        className="platform-lifecycle-journey-panel"
        key={slide.id}
      >
        <div className="platform-lifecycle-journey-lead">
          <StageGraphic slideId={slide.id} isActive />
          <div className="platform-lifecycle-journey-copy">
            <p className="platform-lifecycle-journey-label">{slide.label}</p>
            <h3 className="platform-lifecycle-journey-title">
              {slide.title}
            </h3>
          </div>
        </div>
        <p className="platform-lifecycle-journey-body">{slide.copy}</p>
        <ul className="platform-lifecycle-journey-bullets">
          {slide.bullets.map((bullet) => (
            <li key={bullet}>
              <span className="platform-lifecycle-journey-check" aria-hidden>
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <p className="platform-lifecycle-journey-foot">{slide.foot}</p>
        <DiscoverLink href={slide.discoverHref}>Discover</DiscoverLink>
      </div>
    </div>
  );
}

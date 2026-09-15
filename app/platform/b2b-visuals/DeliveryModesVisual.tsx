"use client";

import Image from "next/image";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import {
  caseStudyPassportUrl,
  PASSPORT_CASE_STUDY,
} from "../../../lib/enterprise/passport-case-study";
import { useReducedMotion, useScrollProgress } from "../b2b-motion";
import { SERIF } from "../platform-ui";

const PASSPORT_FIELDS = [
  { label: "Materials", icon: "◆" },
  { label: "Care", icon: "◇" },
  { label: "Origin", icon: "○" },
  { label: "Impact", icon: "◎" },
] as const;

const STORY_STEPS = [
  {
    id: "identity",
    label: "Product identity · materials · origin · traceability",
    detail: "One governed record brings together composition, supplier inputs, manufacturing evidence, and traceability structure.",
    image: "/platform/workspace-products.png",
    imageAlt: "INTERTEXE workspace showing product identity, materials, and traceability fields.",
  },
  {
    id: "publish",
    label: "Publication engine — approved fields only",
    detail: "Approved data becomes the publication layer — choose templates, carriers, and what consumers see before go-live.",
    image: "/platform/act-passport.png",
    imageAlt: "INTERTEXE publish screen with passport preview and approved field controls.",
  },
  {
    id: "delivery",
    label: "Delivery layer — Hosted · White Label · API",
    detail: "The same record powers hosted passports, your brand domain, or headless JSON — not three separate datasets.",
    image: "/platform/ecosystem-brand-channels.jpg",
    imageAlt: "Brand channels receiving the same governed product record through multiple delivery modes.",
  },
  {
    id: "carrier",
    label: "Data carrier — QR · NFC · RFID",
    detail: "Attach persistent identity to the physical product — QR primary today, NFC and RFID compatible from the same record.",
    image: "/platform/surface-iphone-scanner.jpg",
    imageAlt: "Phone scanning a product tag to resolve the digital product passport.",
  },
  {
    id: "consumer",
    label: "Consumer — brand app · brand site · hosted passport",
    detail: "After scan, consumers see materials, care, repair, and next life — whether you host it or embed it in your own experience.",
    image: "/platform/demo-see-it-live.jpg",
    imageAlt: "Consumer passport experience after scan — care, repair, resale, and circular next life.",
  },
] as const;

const DELIVERY_MODES = [
  { label: "Hosted", tier: "Platform" },
  { label: "White label", tier: "Pro · Ent" },
  { label: "Headless API", tier: "Enterprise" },
] as const;

function HostedPassportMini() {
  const passportUrl = caseStudyPassportUrl();
  const shortName = PASSPORT_CASE_STUDY.productName.split(" ").slice(-3).join(" ");

  return (
    <div className="platform-delivery-mini-passport">
      <div className="platform-delivery-mini-passport-head">
        <span>INTERTEXE</span>
        <span>Digital Product Passport</span>
      </div>
      <div className="platform-delivery-mini-passport-body">
        <div className="platform-delivery-mini-passport-image">
          <Image src={PASSPORT_CASE_STUDY.imageUrl} alt={PASSPORT_CASE_STUDY.productName} fill className="object-cover" sizes="96px" unoptimized />
        </div>
        <div>
          <p className="platform-delivery-mini-passport-name" style={SERIF}>{shortName}</p>
          <p className="platform-delivery-mini-passport-meta">{PASSPORT_CASE_STUDY.composition}</p>
        </div>
        <div className="platform-delivery-mini-passport-qr">
          <QRCodeCanvas value={passportUrl} size={44} marginSize={1} />
        </div>
      </div>
    </div>
  );
}

function DeliveryModesMiniRow() {
  return (
    <div className="platform-delivery-mini-modes">
      {DELIVERY_MODES.map((mode) => (
        <div key={mode.label} className="platform-delivery-mini-mode">
          <p className="platform-delivery-mini-mode-label">{mode.label}</p>
          <p className="platform-delivery-mini-mode-tier">{mode.tier}</p>
        </div>
      ))}
    </div>
  );
}

function CarrierBadges() {
  return (
    <div className="platform-delivery-carrier-badges">
      {[
        ["QR", "Primary · V1"],
        ["NFC", "Compatible"],
        ["RFID", "Compatible"],
      ].map(([label, detail]) => (
        <div key={label} className="platform-delivery-carrier-badge">
          <span>{label}</span>
          <small>{detail}</small>
        </div>
      ))}
    </div>
  );
}

function StepVisual({ stepId, image, imageAlt }: { stepId: string; image: string; imageAlt: string }) {
  if (stepId === "delivery") {
    return (
      <div className="platform-delivery-story-visual platform-delivery-story-visual--stack">
        <DeliveryModesMiniRow />
        <div className="platform-delivery-story-photo">
          <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 420px" />
        </div>
      </div>
    );
  }

  if (stepId === "carrier") {
    return (
      <div className="platform-delivery-story-visual platform-delivery-story-visual--stack">
        <CarrierBadges />
        <div className="platform-delivery-story-photo">
          <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 420px" />
        </div>
      </div>
    );
  }

  if (stepId === "consumer") {
    return (
      <div className="platform-delivery-story-visual platform-delivery-story-visual--stack">
        <HostedPassportMini />
        <div className="platform-delivery-story-photo">
          <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 420px" />
        </div>
      </div>
    );
  }

  return (
    <div className="platform-delivery-story-visual">
      <div className="platform-delivery-story-photo">
        <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 420px" />
      </div>
    </div>
  );
}

export function DeliveryModesVisual() {
  const [trackRef, progress] = useScrollProgress();
  const reduced = useReducedMotion();
  const activeCount = reduced ? STORY_STEPS.length : Math.max(1, Math.ceil(progress * STORY_STEPS.length));

  return (
    <figure className="m-0 platform-delivery-storyline">
      <p className="platform-delivery-storyline-kicker">
        One governed record · three delivery modes · not mutually exclusive
      </p>

      <div ref={trackRef} className="platform-delivery-storyline-track">
        <div className="platform-delivery-storyline-rail" aria-hidden>
          <div className="platform-delivery-storyline-line-bg" />
          <div
            className="platform-delivery-storyline-line-fill"
            style={{ transform: `scaleY(${progress})` }}
          />
        </div>

        <ol className="platform-delivery-storyline-steps">
          {STORY_STEPS.map((step, index) => {
            const active = index < activeCount;
            const side = index % 2 === 0 ? "left" : "right";
            return (
              <li
                key={step.id}
                className={`platform-delivery-storyline-step platform-delivery-storyline-step--${side} ${active ? "is-active" : ""}`}
              >
                <div className="platform-delivery-storyline-copy">
                  <p className="platform-delivery-storyline-index">{index + 1}.</p>
                  <h3 className="platform-delivery-storyline-label" style={SERIF}>{step.label}</h3>
                  <p className="platform-delivery-storyline-detail">{step.detail}</p>
                </div>

                <div className="platform-delivery-storyline-node-wrap">
                  <span className={`platform-delivery-storyline-node ${active ? "is-active" : ""}`} />
                </div>

                <div className="platform-delivery-storyline-visual-wrap">
                  <StepVisual stepId={step.id} image={step.image} imageAlt={step.imageAlt} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <figcaption className="platform-delivery-storyline-caption">
        Live case study · {PASSPORT_CASE_STUDY.brand} ·{" "}
        <Link href={`/p/${PASSPORT_CASE_STUDY.publicId}`} className="underline underline-offset-4">
          open the passport
        </Link>
        . Large brands often run hosted, white-label, and API delivery from the same governed record.
      </figcaption>
    </figure>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PASSPORT_CASE_STUDY } from "../../../lib/enterprise/passport-case-study";

const STORY_STEPS = [
  {
    id: "identity",
    label: "Product identity · materials · origin · traceability",
    detail: "One governed record brings together composition, supplier inputs, manufacturing evidence, and traceability structure.",
    image: "/platform/symbols/story-product-identity.png",
    imageAlt: "Product tag connected to origin, manufacturing, sustainability, and verification across the supply chain.",
  },
  {
    id: "publish",
    label: "Publication engine — approved fields only",
    detail: "Approved data becomes the publication layer — choose templates, carriers, and what consumers see before go-live.",
    image: "/platform/symbols/story-publish-approved.png",
    imageAlt: "Approved product record with verified fields ready for publication.",
  },
  {
    id: "delivery",
    label: "Delivery layer — Hosted · White Label · API",
    detail: "The same record powers hosted passports, your brand domain, or headless JSON — not three separate datasets.",
    image: "/platform/symbols/story-delivery-channels.png",
    imageAlt: "One product record distributed to web, mobile, and API channels.",
  },
  {
    id: "carrier",
    label: "Data carrier — QR · NFC · RFID",
    detail: "Attach persistent identity to the physical product — QR primary today, NFC and RFID compatible from the same record.",
    image: "/platform/symbols/story-carrier-qr-nfc.png",
    imageAlt: "QR and NFC product tag linking the physical garment to its digital record.",
  },
  {
    id: "consumer",
    label: "Consumer — brand app · brand site · hosted passport",
    detail: "After scan, consumers see materials, care, repair, and next life — whether you host it or embed it in your own experience.",
    image: "/platform/symbols/story-consumer-scan.png",
    imageAlt: "Scan a price tag or care label in the INTERTEXE app to read materials and find better options.",
    wide: true,
  },
] as const;

function StepVisual({ image, imageAlt, wide = false }: { image: string; imageAlt: string; wide?: boolean }) {
  return (
    <div className={`platform-delivery-story-visual platform-delivery-story-visual--symbol ${wide ? "is-wide" : ""}`}>
      <div className="platform-delivery-story-photo platform-delivery-story-photo--symbol">
        <Image
          src={image}
          alt={imageAlt}
          width={72}
          height={72}
          unoptimized
          className="platform-delivery-story-symbol-img"
        />
      </div>
    </div>
  );
}

export function DeliveryModesVisual() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <figure className="m-0 platform-delivery-storyline">
      <p className="platform-delivery-storyline-kicker">
        One governed record · three delivery modes · not mutually exclusive
      </p>

      <div className="platform-delivery-storyline-track">
        <div className="platform-delivery-storyline-rail" aria-hidden>
          <div className="platform-delivery-storyline-line-bg" />
          <div
            className="platform-delivery-storyline-line-fill"
            style={{ transform: `scaleY(${(openIndex + 1) / STORY_STEPS.length})` }}
          />
        </div>

        <ol className="platform-delivery-storyline-steps">
          {STORY_STEPS.map((step, index) => {
            const active = index === openIndex;
            const side = index % 2 === 0 ? "left" : "right";
            return (
              <li
                key={step.id}
                className={`platform-delivery-storyline-step platform-delivery-storyline-step--${side} ${active ? "is-active" : ""}`}
              >
                <div className="platform-delivery-storyline-copy">
                  <p className="platform-delivery-storyline-index">{index + 1}.</p>
                  <h3 className="platform-delivery-storyline-label">
                    <button
                      type="button"
                      className="platform-delivery-storyline-trigger"
                      aria-expanded={active}
                      aria-controls={`delivery-step-panel-${step.id}`}
                      id={`delivery-step-${step.id}`}
                      onClick={() => setOpenIndex(index)}
                    >
                      {step.label}
                    </button>
                  </h3>
                  <div
                    id={`delivery-step-panel-${step.id}`}
                    role="region"
                    aria-labelledby={`delivery-step-${step.id}`}
                    aria-hidden={!active}
                    className="platform-delivery-storyline-reveal"
                  >
                    <div className="platform-delivery-storyline-reveal-inner">
                      <p className="platform-delivery-storyline-detail">{step.detail}</p>
                    </div>
                  </div>
                </div>

                <div className="platform-delivery-storyline-node-wrap">
                  <span className={`platform-delivery-storyline-node ${active ? "is-active" : ""}`} />
                </div>

                <div className="platform-delivery-storyline-visual-wrap">
                  <StepVisual image={step.image} imageAlt={step.imageAlt} wide={"wide" in step && step.wide} />
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

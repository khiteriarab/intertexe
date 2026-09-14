"use client";

import Image from "next/image";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import {
  caseStudyPassportUrl,
  PASSPORT_CASE_STUDY,
} from "../../../lib/enterprise/passport-case-study";
import { SERIF } from "../platform-ui";

const PASSPORT_FIELDS = [
  { label: "Materials", icon: "◆" },
  { label: "Care", icon: "◇" },
  { label: "Origin", icon: "○" },
  { label: "Impact", icon: "◎" },
] as const;

const MODES = [
  {
    id: "hosted",
    label: "Hosted Passport",
    tier: "Platform",
    copy: "Launch beautiful, compliant product passports on INTERTEXE — no development required.",
    bullets: ["Branded experience", "Mobile optimized", "Always up to date"],
    href: "/platform/demo",
    cta: "Learn about Hosted Passports →",
    example: `intertexe.com/p/${PASSPORT_CASE_STUDY.publicId.slice(0, 8)}…`,
  },
  {
    id: "whitelabel",
    label: "White Label",
    tier: "Professional · Enterprise",
    copy: "Same governed data, in your brand's design system. Your customer sees your domain, not ours.",
    bullets: ["Your logo and styling", "Full feature set", "Build consumer trust"],
    href: "/platform/request?intent=snapshot&cta=delivery_whitelabel",
    cta: "Learn about White Label →",
    example: "passport.yourbrand.com/p/ABC123",
  },
  {
    id: "headless",
    label: "Headless API",
    tier: "Enterprise",
    copy: "Structured passport JSON for your app, website, or service. Power any experience, your way.",
    bullets: ["Developer friendly", "Reliable and scalable", "Full data model"],
    href: "/platform/api",
    cta: "View API documentation →",
    example: `GET /v1/products/${PASSPORT_CASE_STUDY.styleCode}/passport`,
  },
] as const;

const STACK = [
  "Product identity · materials · origin · traceability",
  "Publication engine — approved fields only",
  "Delivery layer — Hosted · White Label · API",
  "Data carrier — QR · NFC · RFID",
  "Consumer — brand app · brand site · hosted passport",
] as const;

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-[var(--platform-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function HostedPassportGraphic() {
  const passportUrl = caseStudyPassportUrl();
  const shortName = PASSPORT_CASE_STUDY.productName.split(" ").slice(-3).join(" ");

  return (
    <div className="platform-delivery-graphic platform-delivery-graphic-hosted">
      <div className="platform-delivery-passport-ui">
        <div className="platform-delivery-passport-header">
          <span className="platform-delivery-passport-brand">INTERTEXE</span>
          <span className="platform-delivery-passport-tagline">A more transparent wardrobe.</span>
        </div>
        <div className="platform-delivery-passport-body">
          <div className="platform-delivery-passport-product">
            <div className="platform-delivery-passport-image">
              <Image
                src={PASSPORT_CASE_STUDY.imageUrl}
                alt={PASSPORT_CASE_STUDY.productName}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>
            <p className="platform-delivery-passport-name" style={SERIF}>
              {shortName}
            </p>
            <p className="platform-delivery-passport-meta">{PASSPORT_CASE_STUDY.composition}</p>
          </div>
          <div className="platform-delivery-passport-side">
            <ul className="platform-delivery-passport-fields">
              {PASSPORT_FIELDS.map((field) => (
                <li key={field.label}>
                  <span aria-hidden>{field.icon}</span>
                  {field.label}
                </li>
              ))}
            </ul>
            <div className="platform-delivery-passport-qr">
              <QRCodeCanvas value={passportUrl} size={52} marginSize={1} />
            </div>
          </div>
        </div>
      </div>
      <span className="platform-delivery-arrow" aria-hidden>
        →
      </span>
    </div>
  );
}

function WhiteLabelGraphic() {
  return (
    <div className="platform-delivery-graphic platform-delivery-graphic-whitelabel">
      <div className="platform-delivery-stack">
        <div className="platform-delivery-stack-card platform-delivery-stack-card-back" aria-hidden />
        <div className="platform-delivery-stack-card platform-delivery-stack-card-mid" aria-hidden />
        <div className="platform-delivery-stack-card platform-delivery-stack-card-front">
          <p className="platform-delivery-stack-brand">Your Brand</p>
          <div className="platform-delivery-stack-row">
            <div className="platform-delivery-stack-image">
              <Image
                src={PASSPORT_CASE_STUDY.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="72px"
              />
            </div>
            <ul className="platform-delivery-stack-fields">
              {PASSPORT_FIELDS.map((field) => (
                <li key={field.label}>{field.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <span className="platform-delivery-arrow" aria-hidden>
        →
      </span>
    </div>
  );
}

function HeadlessApiGraphic() {
  const json = `GET /v1/passport

{
  "product_id": "${PASSPORT_CASE_STUDY.styleCode}",
  "public_id": "${PASSPORT_CASE_STUDY.publicId}",
  "materials": [
    {
      "name": "Linen",
      "percentage": 100,
      "origin": "Portugal"
    }
  ],
  "manufacturer": "Atelier Norte",
  "care": "Machine wash cold"
}`;

  return (
    <div className="platform-delivery-graphic platform-delivery-graphic-api">
      <pre className="platform-delivery-code">
        <code>{json}</code>
      </pre>
      <span className="platform-delivery-arrow platform-delivery-arrow-light" aria-hidden>
        →
      </span>
    </div>
  );
}

function ModeGraphic({ id }: { id: (typeof MODES)[number]["id"] }) {
  if (id === "hosted") return <HostedPassportGraphic />;
  if (id === "whitelabel") return <WhiteLabelGraphic />;
  return <HeadlessApiGraphic />;
}

export function DeliveryModesVisual() {
  const [activeId, setActiveId] = useState<(typeof MODES)[number]["id"]>("hosted");

  return (
    <figure className="m-0 platform-delivery-visual">
      <div className="platform-delivery-cards">
        {MODES.map((mode) => {
          const active = activeId === mode.id;
          return (
            <article
              key={mode.id}
              className={`platform-delivery-card ${active ? "is-active" : ""}`}
              onMouseEnter={() => setActiveId(mode.id)}
              onFocus={() => setActiveId(mode.id)}
            >
              <button
                type="button"
                className="platform-delivery-card-select"
                aria-pressed={active}
                onClick={() => setActiveId(mode.id)}
              >
                <span className="sr-only">Preview {mode.label}</span>
              </button>
              <div className="platform-delivery-card-visual">
                <ModeGraphic id={mode.id} />
              </div>
              <div className="platform-delivery-card-copy">
                <div className="platform-delivery-card-head">
                  <h3 className="platform-delivery-card-title" style={SERIF}>
                    {mode.label}
                  </h3>
                  <span className="platform-delivery-card-tier">{mode.tier}</span>
                </div>
                <p className="platform-delivery-card-desc">{mode.copy}</p>
                <ul className="platform-delivery-card-bullets">
                  {mode.bullets.map((bullet) => (
                    <li key={bullet}>
                      <CheckIcon />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="platform-delivery-card-example">{mode.example}</p>
                <Link href={mode.href} className="platform-delivery-card-link">
                  {mode.cta}
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <div className="platform-delivery-stack-footer itx-editorial-panel overflow-hidden">
        <div className="itx-editorial-panel-inner platform-abstract-band itx-abstract-motif px-6 sm:px-8 py-5">
          <p className="relative text-[10px] tracking-[0.18em] uppercase text-[var(--platform-accent)] mb-3">
            One governed record · three delivery modes · not mutually exclusive
          </p>
          <ol className="relative flex flex-wrap gap-x-6 gap-y-2">
            {STACK.map((layer, index) => (
              <li key={layer} className="text-xs text-[var(--platform-muted)] flex items-center gap-2">
                <span className="text-[var(--platform-accent)] tabular-nums">{index + 1}.</span>
                {layer}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <figcaption className="mt-3 text-xs text-[var(--platform-quiet)] leading-relaxed">
        Live case study · {PASSPORT_CASE_STUDY.brand} · scan the QR in Hosted Passport or{" "}
        <Link href={`/p/${PASSPORT_CASE_STUDY.publicId}`} className="underline underline-offset-4">
          open the passport
        </Link>
        . Large brands often run all three modes from the same governed record.
      </figcaption>
    </figure>
  );
}

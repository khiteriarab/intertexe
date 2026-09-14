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

const SOURCES = [
  { label: "PLM", icon: "▣" },
  { label: "ERP", icon: "◫" },
  { label: "Spreadsheets", icon: "▤" },
  { label: "Supplier files", icon: "▥" },
] as const;

const PASSPORT_FIELDS = [
  "Materials",
  "Supply Chain",
  "Compliance",
  "Impact",
  "Care & Repair",
] as const;

const DELIVERY_CHANNELS = [
  { id: "app", label: "Your App", sub: "In-app product page", icon: "phone" as const },
  { id: "domain", label: "Your Brand Domain", sub: "passport.yourbrand.com", icon: "globe" as const },
  { id: "api", label: "Headless API", sub: "Integrate anywhere", icon: "code" as const },
] as const;

const STAGES = [
  {
    id: "govern" as const,
    label: "Govern",
    title: "Connect & structure your product data.",
    copy: "Connect PLM, ERP, spreadsheets and supplier files into one structured product record — with evidence, provenance, and approval workflow.",
  },
  {
    id: "publish" as const,
    label: "Publish",
    title: "Turn data into experiences.",
    copy: "Turn approved data into passports, regulatory readiness, and consumer-ready product experiences — not just compliance fields in a dashboard.",
  },
  {
    id: "deliver" as const,
    label: "Deliver",
    title: "One record. Every channel.",
    copy: "Hosted passport, white-label domain, or headless API into your existing app. One governed record powers every channel.",
  },
];

function DeliverChannelIcon({ kind }: { kind: "phone" | "globe" | "code" }) {
  const cls = "h-3.5 w-3.5 text-[var(--platform-primary)]";
  if (kind === "phone") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  if (kind === "globe") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

function StageIcon({ kind }: { kind: "govern" | "publish" | "deliver" }) {
  const cls = "h-[22px] w-[22px] text-[var(--platform-primary)]";
  if (kind === "govern") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
      </svg>
    );
  }
  if (kind === "publish") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

function ExperienceArrow({ className = "" }: { className?: string }) {
  return (
    <span className={`platform-what-experience-arrow ${className}`} aria-hidden>
      →
    </span>
  );
}

function GovernDiagram({ active }: { active: boolean }) {
  return (
    <div className={`platform-what-diagram ${active ? "is-active" : ""}`}>
      <div className="platform-what-source-grid">
        {SOURCES.map((source) => (
          <div key={source.label} className="platform-what-diagram-pill">
            <span className="platform-what-diagram-pill-icon" aria-hidden>
              {source.icon}
            </span>
            {source.label}
          </div>
        ))}
      </div>
      <div className="platform-what-flow-lines" aria-hidden>
        <span className="platform-what-flow-line platform-what-flow-line-a" />
        <span className="platform-what-flow-line platform-what-flow-line-b" />
        <span className="platform-what-flow-line platform-what-flow-line-c" />
        <span className="platform-what-flow-line platform-what-flow-line-d" />
      </div>
      <div className="platform-what-diagram-connector">
        <ExperienceArrow />
        <span className="platform-what-diagram-connector-label">Governed record</span>
      </div>
      <div className="platform-what-diagram-output">
        <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
          <Image
            src={PASSPORT_CASE_STUDY.imageUrl}
            alt={PASSPORT_CASE_STUDY.productName}
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">
            Governed product record
          </p>
          <p className="text-[11px] text-[var(--platform-muted)] truncate">{PASSPORT_CASE_STUDY.styleCode}</p>
          <p className="text-[10px] text-[var(--platform-quiet)] truncate">{PASSPORT_CASE_STUDY.composition}</p>
        </div>
        <span className="platform-what-check" aria-hidden>
          ✓
        </span>
      </div>
    </div>
  );
}

function PublishDiagram({ active }: { active: boolean }) {
  const passportUrl = caseStudyPassportUrl();
  const displayName = PASSPORT_CASE_STUDY.productName.split(" ").slice(-4).join(" ");

  return (
    <div className={`platform-what-diagram ${active ? "is-active" : ""}`}>
      <div className="platform-what-publish-flow">
        <div className="platform-what-approved-chip">
          <div className="relative h-9 w-8 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
            <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="32px" />
          </div>
          <div>
            <p className="text-[8px] tracking-[0.12em] uppercase text-[var(--platform-quiet)]">Approved record</p>
            <p className="text-[10px] text-[var(--platform-muted)]">{PASSPORT_CASE_STUDY.styleCode}</p>
          </div>
          <span className="platform-what-check platform-what-check-sm" aria-hidden>
            ✓
          </span>
        </div>
        <ExperienceArrow className="platform-what-experience-arrow-inline" />
        <div className="platform-what-passport-card">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
            <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="48px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">
              Digital Product Passport
            </p>
            <p className="text-[11px] text-[var(--platform-ink)] mt-0.5 leading-snug" style={SERIF}>
              {displayName}
            </p>
            <ul className="platform-what-passport-fields mt-2">
              {PASSPORT_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
          <div className="platform-what-passport-qr shrink-0">
            <QRCodeCanvas value={passportUrl} size={56} marginSize={1} />
            <Link href={`/p/${PASSPORT_CASE_STUDY.publicId}`} className="platform-what-passport-qr-link">
              Scan live →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliverDiagram({ active }: { active: boolean }) {
  const passportUrl = caseStudyPassportUrl();
  const displayName = PASSPORT_CASE_STUDY.productName.split(" ").slice(-4).join(" ");

  return (
    <div className={`platform-what-diagram platform-what-diagram-deliver ${active ? "is-active" : ""}`}>
      <div className="platform-what-experience-phone">
        <div className="platform-what-phone-mock">
          <div className="platform-what-phone-screen">
            <div className="platform-what-phone-ui">
              <p className="platform-what-phone-brand">INTERTEXE</p>
              <div className="relative h-14 w-full overflow-hidden rounded-md bg-[#f0ebe4] mb-2">
                <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="100px" />
              </div>
              <p className="platform-what-phone-title" style={SERIF}>
                {displayName}
              </p>
              <ul className="platform-what-phone-fields">
                {["Materials", "Origin", "Care", "Impact"].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="platform-what-phone-qr">
                <QRCodeCanvas value={passportUrl} size={34} marginSize={0} />
              </div>
            </div>
          </div>
        </div>
        <ExperienceArrow className="platform-what-experience-arrow-deliver" />
      </div>
      <div className="platform-what-deliver-branches">
        {DELIVERY_CHANNELS.map((channel) => (
          <div key={channel.id} className="platform-what-deliver-branch">
            <span className="platform-what-deliver-icon" aria-hidden>
              <DeliverChannelIcon kind={channel.icon} />
            </span>
            <div>
              <p className="text-[10px] text-[var(--platform-ink)]">{channel.label}</p>
              <p className="text-[9px] text-[var(--platform-quiet)]">{channel.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageDiagram({ id, active }: { id: (typeof STAGES)[number]["id"]; active: boolean }) {
  if (id === "govern") return <GovernDiagram active={active} />;
  if (id === "publish") return <PublishDiagram active={active} />;
  return <DeliverDiagram active={active} />;
}

export function WhatItIsProcessVisual() {
  const [activeId, setActiveId] = useState<(typeof STAGES)[number]["id"]>("govern");

  return (
    <div className="platform-what-cards platform-what-cards-interactive">
      {STAGES.map((stage, i) => {
        const active = activeId === stage.id;
        return (
          <div key={stage.id} className="contents">
            <article
              className={`platform-what-card ${active ? "is-active" : ""}`}
              onMouseEnter={() => setActiveId(stage.id)}
            >
              <button
                type="button"
                className="platform-what-card-trigger"
                aria-pressed={active}
                onClick={() => setActiveId(stage.id)}
              >
                <header className="platform-what-card-header">
                  <span className="platform-what-card-icon" aria-hidden>
                    <StageIcon kind={stage.id} />
                  </span>
                  <div>
                    <p className="platform-what-card-label">{stage.label}</p>
                    <h3 className="platform-what-card-title" style={SERIF}>
                      {stage.title}
                    </h3>
                  </div>
                </header>
                <p className="platform-what-card-copy">{stage.copy}</p>
                <StageDiagram id={stage.id} active={active} />
              </button>
            </article>
            {i < STAGES.length - 1 ? (
              <div className="hidden lg:flex items-center justify-center px-1 xl:px-2" aria-hidden>
                <span className="platform-what-between-arrow">→</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

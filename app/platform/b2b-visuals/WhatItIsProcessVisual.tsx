import Image from "next/image";
import { PLATFORM_CASE_STUDY } from "../../../lib/enterprise/platform-showcase";
import { SERIF } from "../platform-ui";

const SOURCES = ["PLM", "ERP", "Spreadsheets", "Supplier files"] as const;

const PASSPORT_FIELDS = ["Materials", "Supply Chain", "Compliance", "Impact", "Care & Repair"] as const;

const DELIVERY_CHANNELS = [
  { id: "app", label: "Your App", icon: "phone" as const },
  { id: "domain", label: "Your Brand Domain", icon: "globe" as const },
  { id: "api", label: "Headless API", sub: "Integrate anywhere", icon: "code" as const },
] as const;

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
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
    </svg>
  );
}

function FlowArrow({ className = "" }: { className?: string }) {
  return (
    <div className={`hidden lg:flex items-center justify-center px-1 xl:px-2 ${className}`} aria-hidden>
      <span className="text-[var(--platform-accent)] text-lg leading-none">→</span>
    </div>
  );
}

function GovernDiagram() {
  return (
    <div className="platform-what-diagram">
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {SOURCES.map((source) => (
          <div key={source} className="platform-what-diagram-pill">
            <span className="platform-what-diagram-pill-icon" aria-hidden>
              ◦
            </span>
            {source}
          </div>
        ))}
      </div>
      <div className="platform-what-diagram-connector" aria-hidden>
        <span className="platform-what-diagram-line" />
        <span>↓</span>
      </div>
      <div className="platform-what-diagram-output">
        <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
          <Image src={PLATFORM_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="36px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">Governed product record</p>
          <p className="text-[11px] text-[var(--platform-muted)] truncate">{PLATFORM_CASE_STUDY.styleCode}</p>
        </div>
        <span className="platform-what-check" aria-hidden>
          ✓
        </span>
      </div>
    </div>
  );
}

function PublishDiagram() {
  return (
    <div className="platform-what-diagram">
      <div className="platform-what-diagram-pill platform-what-diagram-pill-wide">
        Approved product record
      </div>
      <div className="platform-what-diagram-connector" aria-hidden>
        <span className="platform-what-diagram-line" />
        <span>→</span>
      </div>
      <div className="platform-what-passport-card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Digital Product Passport</p>
            <p className="text-sm text-[var(--platform-ink)] mt-0.5" style={SERIF}>
              {PLATFORM_CASE_STUDY.productName.split(" ").slice(0, 3).join(" ")}…
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-md border border-[var(--platform-border)] bg-white grid place-items-center">
            <span className="text-[8px] font-mono text-[var(--platform-muted)]">QR</span>
          </div>
        </div>
        <ul className="space-y-1.5">
          {PASSPORT_FIELDS.map((field) => (
            <li key={field} className="flex items-center gap-2 text-[10px] text-[var(--platform-muted)]">
              <span className="h-1 w-1 rounded-full bg-[var(--platform-accent)]" aria-hidden />
              {field}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeliverDiagram() {
  return (
    <div className="platform-what-diagram platform-what-diagram-deliver">
      <div className="platform-what-phone-mock">
        <div className="platform-what-phone-screen">
          <div className="relative h-full w-full overflow-hidden rounded-[10px] bg-[#f0ebe4]">
            <Image src={PLATFORM_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="80px" />
          </div>
        </div>
      </div>
      <div className="platform-what-deliver-branches">
        {DELIVERY_CHANNELS.map((channel) => (
          <div key={channel.id} className="platform-what-deliver-branch">
            <span className="platform-what-deliver-icon" aria-hidden>
              <DeliverChannelIcon kind={channel.icon} />
            </span>
            <div>
              <p className="text-[10px] text-[var(--platform-ink)]">{channel.label}</p>
              {"sub" in channel && channel.sub ? (
                <p className="text-[9px] text-[var(--platform-quiet)]">{channel.sub}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STAGES = [
  {
    id: "govern",
    label: "Govern",
    title: "Connect & structure your product data.",
    copy: "Connect PLM, ERP, spreadsheets and supplier files into one structured product record — with evidence, provenance, and approval workflow.",
    diagram: <GovernDiagram />,
  },
  {
    id: "publish",
    label: "Publish",
    title: "Turn data into experiences.",
    copy: "Turn approved data into passports, regulatory readiness, and consumer-ready product experiences — not just compliance fields in a dashboard.",
    diagram: <PublishDiagram />,
  },
  {
    id: "deliver",
    label: "Deliver",
    title: "One record. Every channel.",
    copy: "Hosted passport, white-label domain, or headless API into your existing app. One governed record powers every channel.",
    diagram: <DeliverDiagram />,
  },
] as const;

export function WhatItIsProcessVisual() {
  return (
    <div className="platform-what-cards">
      {STAGES.map((stage, i) => (
        <div key={stage.id} className="contents">
          <article className="platform-what-card">
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
            {stage.diagram}
          </article>
          {i < STAGES.length - 1 ? <FlowArrow /> : null}
        </div>
      ))}
    </div>
  );
}

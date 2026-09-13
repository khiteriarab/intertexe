import { SERIF } from "../platform-ui";

const FLOW_STEPS = [
  {
    num: "01",
    title: "Source",
    copy: "Ingest product data from PLM, ERP, suppliers, or your existing systems.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Normalize",
    copy: "Clean, enrich, and standardize key product attributes and material composition.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3 14.5 8.5 20 9l-4 3.5L17 18l-5-3-5 3 1-5.5L4 9l5.5-.5L12 3Z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Validate",
    copy: "Flag missing data, ensure compliance, and add verified evidence.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Publish",
    copy: "Create a digital product passport, ready for consumer and partner channels.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3 20 7v10l-8 4-8-4V7l8-4Z" />
        <path d="M12 12 20 7M12 12 4 7M12 12v9" />
      </svg>
    ),
  },
  {
    num: "05",
    title: "Activate",
    copy: "Power your website, app, resale partners, and sustainability reporting.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c0-2.2 1.8-4 4-4" />
      </svg>
    ),
  },
  {
    num: "06",
    title: "Measure",
    copy: "Track performance, benchmark, and improve over time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
      </svg>
    ),
  },
] as const;

export function DemoIntertexeFlow() {
  return (
    <section id="flow" className="demo-editorial-flow scroll-mt-24 border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <h2 className="text-[1.75rem] sm:text-[2rem] font-light mb-3" style={SERIF}>
          The INTERTEXE Flow
        </h2>
        <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl mb-10 lg:mb-12">
          One product. A complete lifecycle — from source data to the passport your customer scans.
        </p>
        <div className="demo-editorial-flow-grid">
          {FLOW_STEPS.map((step, index) => (
            <div key={step.title} className="demo-editorial-flow-step">
              {index > 0 ? <span className="demo-editorial-flow-arrow" aria-hidden>→</span> : null}
              <div className="demo-editorial-flow-icon">{step.icon}</div>
              <p className="demo-editorial-flow-num">{step.num}</p>
              <p className="demo-editorial-flow-title">{step.title}</p>
              <p className="demo-editorial-flow-copy">{step.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

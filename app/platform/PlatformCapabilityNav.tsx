"use client";

import { PLATFORM_SCROLL_STAGES } from "./platform-scroll-stages";

function StageNavIcon({ id }: { id: string }) {
  const cls = "h-4 w-4";
  if (id === "trace") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }
  if (id === "measure") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
      </svg>
    );
  }
  if (id === "govern") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3 3 7v6c0 5 4.5 8 9 8s9-3 9-8V7l-9-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (id === "publish") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function scrollToPlatformStage(id: string) {
  const target = document.getElementById(`platform-scroll-${id}`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.getElementById("platform-journey")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  window.dispatchEvent(new CustomEvent("platform-select-stage", { detail: { id } }));
}

export function PlatformCapabilityNav({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Platform capabilities"
      className={`platform-capability-nav ${className}`}
    >
      <p className="platform-capability-nav-label">Platform capabilities</p>
      <div className="platform-capability-nav-items" role="list">
        {PLATFORM_SCROLL_STAGES.map((stage, i) => (
          <div key={stage.id} className="contents" role="listitem">
            <button
              type="button"
              onClick={() => scrollToPlatformStage(stage.id)}
              className="platform-capability-nav-item"
            >
              <StageNavIcon id={stage.id} />
              <span>{stage.kicker}</span>
            </button>
            {i < PLATFORM_SCROLL_STAGES.length - 1 ? (
              <span className="platform-capability-nav-arrow" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="platform-capability-nav-tagline hidden sm:block">One record · every stage</p>
    </nav>
  );
}

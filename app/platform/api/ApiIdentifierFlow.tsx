import { API_FLOW_STEPS } from "./api-docs-shared";
import { SERIF } from "../platform-ui";

function FlowIcon({ index }: { index: number }) {
  const cls = "h-[18px] w-[18px]";
  const icons = [
    <svg key="1" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 6h16M4 10h12M4 14h8M4 18h4" />
      <path d="M18 14v4h4" />
    </svg>,
    <svg key="2" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>,
    <svg key="3" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12Z" />
      <path d="M12 10v4" />
    </svg>,
    <svg key="4" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3 3 7v6c0 5 4.5 8 9 8s9-3 9-8V7l-9-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>,
    <svg key="5" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>,
  ];
  return icons[index] ?? icons[0];
}

export function ApiIdentifierFlow() {
  return (
    <section className="api-editorial-flow border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-10 xl:gap-16 lg:items-end mb-10 lg:mb-12">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">How it works</p>
            <h2 className="text-[1.85rem] sm:text-[2.35rem] font-light leading-[1.1]" style={SERIF}>
              From identifier to intelligence.
            </h2>
          </div>
          <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed lg:pb-1">
            A single API call turns a product identifier into verified material intelligence — normalized composition,
            evidence status, and DPP-readiness your PIM, PLM, or passport workflow can consume.
          </p>
        </div>

        <div className="api-editorial-process">
          {API_FLOW_STEPS.map((step, i) => (
            <div key={step.num} className="api-editorial-process-step">
              {i > 0 ? <span className="api-editorial-process-line" aria-hidden /> : null}
              <span className="api-editorial-process-icon">
                <FlowIcon index={i} />
              </span>
              <p className="api-editorial-process-num">{step.num}</p>
              <p className="api-editorial-process-label">{step.label}</p>
              <p className="api-editorial-process-detail">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

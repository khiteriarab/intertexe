import { API_FLOW_STEPS } from "./api-docs-shared";
import { SERIF } from "../platform-ui";

function FlowIcon({ index }: { index: number }) {
  const cls = "h-[18px] w-[18px]";
  const icons = [
    <svg key="1" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 6h16M4 12h10M4 18h6" />
    </svg>,
    <svg key="2" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>,
    <svg key="3" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </svg>,
    <svg key="4" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 3 3 7v6c0 5 4.5 8 9 8s9-3 9-8V7l-9-4Z" />
    </svg>,
    <svg key="5" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h4" />
    </svg>,
  ];
  return icons[index] ?? icons[0];
}

export function ApiIdentifierFlow() {
  return (
    <section className="border-y border-[var(--platform-border)] bg-white/60">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 lg:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">How it works</p>
          <h2 className="text-[1.65rem] sm:text-2xl font-light leading-[1.12]" style={SERIF}>
            From identifier to intelligence
          </h2>
          <p className="mt-3 text-[15px] text-[var(--platform-muted)] font-light">
            The API is a transformation engine — not merely an endpoint.
          </p>
        </div>
        <div className="api-docs-process">
          {API_FLOW_STEPS.map((step, i) => (
            <div key={step.num} className="contents">
              <div className="api-docs-process-step">
                <span className="api-docs-process-icon">
                  <FlowIcon index={i} />
                </span>
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-1">{step.num}</p>
                <p className="text-[12px] text-[var(--platform-ink)] leading-snug mb-0.5">{step.label}</p>
                <p className="text-[10px] text-[var(--platform-muted)] leading-snug">{step.detail}</p>
              </div>
              {i < API_FLOW_STEPS.length - 1 ? (
                <span className="api-docs-process-arrow" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

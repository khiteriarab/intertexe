import Link from "next/link";
import { DEMO_GTIN_VERIFIED } from "../../../lib/material-intelligence/demo-records";
import { SERIF } from "../platform-ui";

const CARDS = [
  {
    title: "Public",
    badge: "Demo endpoint",
    points: ["No auth", "Limited sample records", "Safe for documentation"],
    href: "/platform/demo#api",
    cta: "Try live lookup",
    external: false,
  },
  {
    title: "Production",
    badge: "Authenticated",
    points: ["Bearer token", "Real catalog usage", "Per-key rate limits"],
    href: "/platform/request?intent=api_access&cta=docs",
    cta: "Discuss API access",
    external: false,
  },
  {
    title: "OpenAPI 3.1",
    badge: "Schema contract",
    points: ["Endpoint definitions", "Response shapes", "Error envelopes"],
    href: "/api/openapi.json",
    cta: "Download OpenAPI 3.1",
    external: true,
  },
] as const;

export function ApiAccessCards() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 lg:py-14">
      <div className="api-docs-access-grid">
        {CARDS.map((card) => (
          <article key={card.title} className="api-docs-access-card">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] mb-1">{card.badge}</p>
            <h2 className="text-xl text-[var(--platform-ink)] mb-3" style={SERIF}>
              {card.title}
            </h2>
            <ul className="space-y-2 mb-6 flex-1">
              {card.points.map((point) => (
                <li key={point} className="text-sm text-[var(--platform-muted)] flex items-start gap-2">
                  <span className="text-[var(--platform-accent)] mt-0.5" aria-hidden>
                    ·
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            {card.external ? (
              <a
                href={card.href}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-primary)] hover:text-[var(--platform-accent)]"
              >
                {card.cta}
                <span aria-hidden>→</span>
              </a>
            ) : (
              <Link
                href={card.href}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-primary)] hover:text-[var(--platform-accent)]"
              >
                {card.cta}
                <span aria-hidden>→</span>
              </Link>
            )}
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-[var(--platform-quiet)] text-center">
        Demo sample GTIN · <span className="font-mono">{DEMO_GTIN_VERIFIED}</span>
      </p>
    </section>
  );
}

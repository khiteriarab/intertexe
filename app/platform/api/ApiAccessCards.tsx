import Link from "next/link";
import { SERIF } from "../platform-ui";

const CARDS = [
  {
    method: "GET",
    path: "/api/v1/demo/composition/{gtin}",
    title: "Public demo",
    description: "No auth. A limited sample record for documentation and sales demos.",
    href: "#quickstart",
    cta: "Try live lookup",
    external: false,
  },
  {
    method: "GET",
    path: "/api/v1/composition/{gtin}",
    title: "Production",
    description:
      "Bearer token required. Returns normalized composition, evidence and DPP-readiness for your catalog.",
    href: "/platform/request?intent=api_access&cta=docs",
    cta: "Discuss API access",
    external: false,
  },
  {
    method: "GET",
    path: "/api/openapi.json",
    title: "OpenAPI 3.1",
    description:
      "Runtime contract for the Material Intelligence API — endpoints, schemas and error shapes.",
    href: "/api/openapi.json",
    cta: "Download OpenAPI 3.1",
    external: true,
  },
] as const;

export function ApiAccessCards() {
  return (
    <section className="api-editorial-access">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 lg:py-14">
        <div className="api-editorial-access-grid">
          {CARDS.map((card) => (
            <article key={card.title} className="api-editorial-access-card">
              <div className="api-editorial-access-endpoint">
                <span className="api-editorial-access-method">{card.method}</span>
                <code>{card.path}</code>
              </div>
              <h2 className="text-lg text-[var(--platform-ink)] mb-2 mt-4" style={SERIF}>
                {card.title}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--platform-muted)] mb-6 flex-1">
                {card.description}
              </p>
              {card.external ? (
                <a href={card.href} className="api-editorial-access-link">
                  {card.cta} →
                </a>
              ) : (
                <Link href={card.href} className="api-editorial-access-link">
                  {card.cta} →
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

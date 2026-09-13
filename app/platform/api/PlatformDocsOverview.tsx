import Link from "next/link";
import { DEMO_GTIN_VERIFIED } from "../../../lib/material-intelligence/demo-records";

const ENDPOINTS = [
  {
    method: "GET",
    path: `/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}`,
    title: "Public demo",
    copy: "No auth. Allowlisted sample records only — safe for documentation and sales demos.",
    href: "/platform/demo",
    cta: "Try live lookup",
  },
  {
    method: "GET",
    path: "/api/v1/composition/{gtin}",
    title: "Production",
    copy: "Bearer token required. Returns normalized composition, evidence, and DPP-readiness for your catalog.",
    href: "/platform/request?intent=api_access&cta=docs",
    cta: "Discuss API access",
  },
  {
    method: "GET",
    path: "/api/openapi.json",
    title: "OpenAPI 3.1",
    copy: "Runtime contract for the Material Intelligence API — endpoints, schemas, and error shapes.",
    href: "/api/openapi.json",
    cta: "Download spec",
    external: true,
  },
] as const;

export function PlatformDocsOverview() {
  return (
    <section className="border-b border-[var(--platform-border)] bg-[var(--platform-surface)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 lg:py-14">
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          {ENDPOINTS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-bg)] p-6 lg:p-7 flex flex-col"
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[10px] tracking-[0.12em] uppercase bg-[var(--platform-navy)] text-white px-2 py-1 rounded">
                  {item.method}
                </span>
                <code className="text-[11px] text-[var(--platform-muted)] break-all">{item.path}</code>
              </div>
              <h2 className="text-lg text-[var(--platform-ink)] mb-2" style={{ fontFamily: "Georgia, serif" }}>
                {item.title}
              </h2>
              <p className="text-sm text-[var(--platform-muted)] leading-relaxed mb-6 flex-1">{item.copy}</p>
              {"external" in item && item.external ? (
                <a
                  href={item.href}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-navy)] hover:text-[var(--platform-accent)]"
                >
                  {item.cta}
                  <span aria-hidden>→</span>
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-navy)] hover:text-[var(--platform-accent)]"
                >
                  {item.cta}
                  <span aria-hidden>→</span>
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SERIF } from "../platform-ui";

const JOURNEY = [
  { id: "live-demo", label: "Live scan", hint: "Desktop → QR → customer" },
  { id: "walkthrough", label: "Catalog", hint: "10-product sample" },
  { id: "api", label: "API lookup", hint: "Live GTIN demo" },
  { id: "book", label: "Book", hint: "Onboarding fee" },
] as const;

export function PlatformDemoShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>(JOURNEY[0].id);

  useEffect(() => {
    const nodes = JOURNEY.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
      <div className="rounded-2xl border border-[var(--platform-border)] bg-white/80 px-4 py-3 sm:px-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-[var(--platform-muted)]">
          Need the full API reference? OpenAPI, auth, and error codes live on the docs page.
        </p>
        <Link
          href="/platform/docs"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-primary)] shrink-0"
        >
          API documentation
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Demo sections"
        className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {JOURNEY.map((item, i) => {
          const selected = item.id === active;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              role="tab"
              aria-selected={selected}
              className={`shrink-0 rounded-full border px-4 py-2.5 min-h-[44px] text-[11px] tracking-[0.12em] uppercase ${
                selected
                  ? "bg-[var(--platform-accent-soft)] text-[var(--platform-primary)] border-[var(--platform-accent-muted)]"
                  : "bg-white text-[var(--platform-muted)] border-[var(--platform-border)]"
              }`}
            >
              {String(i + 1).padStart(2, "0")} {item.label}
            </a>
          );
        })}
      </div>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <aside className="hidden lg:block">
          <nav aria-label="Demo sections" className="sticky top-28 pt-4">
            <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--platform-quiet)] mb-6">On this demo</p>
            <ol className="space-y-1 border-l border-[var(--platform-border)]">
              {JOURNEY.map((item, i) => {
                const selected = item.id === active;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block py-3 pl-4 -ml-px border-l-2 transition-colors ${
                        selected
                          ? "border-[var(--platform-accent)] text-[var(--platform-ink)]"
                          : "border-transparent text-[var(--platform-muted)] hover:text-[var(--platform-ink)]"
                      }`}
                    >
                      <span className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] block mb-0.5">
                        Step {i + 1}
                      </span>
                      <span className="text-[13px] block" style={SERIF}>
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[var(--platform-quiet)]">{item.hint}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

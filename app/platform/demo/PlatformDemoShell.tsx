"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SERIF } from "../platform-ui";

const JOURNEY = [
  { id: "hero", label: "Overview", hint: "Product intelligence tour" },
  { id: "live-scan", label: "Live scan", hint: "Tag → passport" },
  { id: "journey", label: "Workflow", hint: "Six chapters" },
  { id: "catalog", label: "Catalog", hint: "10 sample products" },
  { id: "api", label: "API", hint: "GTIN lookup" },
  { id: "pilot", label: "Pilot", hint: "Start with 10 products" },
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
      { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] }
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12"
      style={{ "--demo-gutter": "clamp(1rem, 4vw, 3rem)" } as React.CSSProperties}
    >
      <div className="rounded-2xl border border-[var(--platform-border)] bg-white/80 px-4 py-3 sm:px-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-[var(--platform-muted)]">Guided product tour · Silk Midi Skirt · ITX-4102</p>
        <Link
          href="/platform/api"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-primary)] shrink-0"
        >
          API documentation
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Tour sections"
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

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <aside className="hidden lg:block">
          <nav aria-label="Tour sections" className="sticky top-28 pt-4">
            <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--platform-quiet)] mb-6">On this tour</p>
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
                        {String(i + 1).padStart(2, "0")}
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

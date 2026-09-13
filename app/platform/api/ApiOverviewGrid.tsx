"use client";

import { API_OVERVIEW_CARDS } from "./api-docs-shared";

function CardIcon({ id }: { id: string }) {
  const cls = "h-4 w-4 text-[var(--platform-primary)]";
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
    </svg>
  );
}

export function ApiOverviewGrid() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="api-docs-overview-grid mb-8">
      {API_OVERVIEW_CARDS.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => scrollTo(card.id)}
          className="api-docs-overview-card"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f0ea]">
            <CardIcon id={card.id} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--platform-ink)]">{card.title}</span>
              <span className="text-[var(--platform-quiet)]" aria-hidden>
                →
              </span>
            </span>
            <span className="block text-[12px] text-[var(--platform-muted)] mt-1 leading-snug">{card.copy}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

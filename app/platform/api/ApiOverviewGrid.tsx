"use client";

import { API_OVERVIEW_CARDS } from "./api-docs-shared";

function CardIcon({ id }: { id: string }) {
  const cls = "h-4 w-4 text-[var(--platform-primary)]";
  if (id === "authentication") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      </svg>
    );
  }
  if (id === "gtin") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 6h16M4 10h12M4 14h8M4 18h4" />
      </svg>
    );
  }
  if (id === "endpoints") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 7h16M4 12h10M4 17h6" />
      </svg>
    );
  }
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
    <div className="api-editorial-overview-grid">
      {API_OVERVIEW_CARDS.map((card) => (
        <button key={card.id} type="button" onClick={() => scrollTo(card.id)} className="api-editorial-overview-card">
          <span className="api-editorial-overview-card-arrow" aria-hidden>
            ↗
          </span>
          <span className="api-editorial-overview-card-icon">
            <CardIcon id={card.id} />
          </span>
          <span className="api-editorial-overview-card-title">{card.title}</span>
          <span className="api-editorial-overview-card-copy">{card.copy}</span>
        </button>
      ))}
    </div>
  );
}

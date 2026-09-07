"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EntIconSearch } from "./EnterpriseNavIcons";

export function GlobalSearch({ organization }: { organization: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ kind: string; label: string; detail: string | null; href: string }>>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/dashboard/org/${organization}/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results || []));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, organization]);

  return (
    <div className="relative ent-topbar-search flex-1 min-w-0 max-w-xl hidden md:block">
      <EntIconSearch className="ent-topbar-search-icon h-[16px] w-[16px]" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products, issues, passports…"
        className="ent-topbar-search-input"
        aria-label="Search workspace"
      />
      {results.length > 0 ? (
        <div className="absolute top-full mt-1.5 w-full rounded-xl border border-[var(--ent-border)] bg-white shadow-lg z-50 max-h-64 overflow-auto">
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.href}`}
              type="button"
              className="block w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--ent-surface-alt)] border-b border-[var(--ent-border)] last:border-0"
              onClick={() => {
                setQ("");
                setResults([]);
                router.push(r.href);
              }}
            >
              <span className="font-medium text-[var(--ent-ink)]">{r.label}</span>
              <span className="text-[var(--ent-muted)] text-xs ml-2 capitalize">{r.kind}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

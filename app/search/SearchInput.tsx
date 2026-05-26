"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { trackSearch } from "../../lib/analytics";

export function SearchInput({
  defaultValue = "",
  resultCount,
}: {
  defaultValue?: string;
  resultCount?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q.length >= 2 && resultCount != null) {
      trackSearch({ searchTerm: q, resultCount });
    }
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search brands, products, fibers..."
          className="w-full border border-border/60 pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-foreground uppercase tracking-widest"
          data-testid="input-search-page"
        />
      </div>
    </form>
  );
}

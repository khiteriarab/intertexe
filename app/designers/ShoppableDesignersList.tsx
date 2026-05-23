"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { BrandStat } from "../../lib/cached-catalog";
import { displayNaturalFiberPercent } from "../../lib/display-natural-fiber";

export function ShoppableDesignersList({ brands }: { brands: BrandStat[] }) {
  const sorted = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
    [brands]
  );

  const { grouped, letters } = useMemo(() => {
    const g: Record<string, BrandStat[]> = {};
    for (const b of sorted) {
      const ch = b.name.charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(ch) ? ch : "#";
      if (!g[letter]) g[letter] = [];
      g[letter].push(b);
    }
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const keys = [...alphabet.filter((l) => g[l]), ...(g["#"] ? ["#"] : [])];
    return { grouped: g, letters: keys };
  }, [sorted]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="flex gap-6 md:gap-10">
      <nav
        className="hidden md:flex flex-col gap-1 text-[10px] font-medium text-muted-foreground sticky top-28 self-start shrink-0"
        aria-label="Jump to letter"
      >
        {alphabet.map((letter) => (
          <a
            key={letter}
            href={`#dir-${letter}`}
            className={grouped[letter] ? "hover:text-foreground" : "opacity-25 pointer-events-none"}
          >
            {letter}
          </a>
        ))}
        {grouped["#"] && (
          <a href="#dir-hash" className="hover:text-foreground">
            #
          </a>
        )}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col gap-10">
        {letters.map((letter) => (
          <section key={letter} id={letter === "#" ? "dir-hash" : `dir-${letter}`} className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-serif border-b border-border/30 pb-2 mb-1">
              {letter === "#" ? "0–9" : letter}
            </h2>
            <ul className="flex flex-col divide-y divide-border/20">
              {grouped[letter].map((brand) => {
                const nfp = displayNaturalFiberPercent(brand.avgNaturalFiber);
                return (
                  <li key={brand.slug}>
                    <Link
                      href={`/designers/${brand.slug}`}
                      className="flex items-center justify-between gap-4 py-4 md:py-4.5 group active:opacity-70"
                      data-testid={`card-shoppable-${brand.slug}`}
                    >
                      <span className="text-sm md:text-base uppercase tracking-[0.06em] font-medium truncate group-hover:text-muted-foreground transition-colors">
                        {brand.name}
                      </span>
                      <div className="flex items-center gap-4 shrink-0">
                        {nfp != null && (
                          <span className="text-[10px] md:text-[11px] tabular-nums text-muted-foreground">
                            {nfp}% natural
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
                          {brand.count.toLocaleString()} pcs
                        </span>
                        <svg
                          className="w-3.5 h-3.5 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

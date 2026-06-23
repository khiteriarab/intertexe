"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import type { BrandStat } from "../../lib/cached-catalog";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function groupBrands(brands: BrandStat[]) {
  const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const grouped: Record<string, BrandStat[]> = {};
  for (const brand of sorted) {
    const ch = brand.name.charAt(0).toUpperCase();
    const letter = /^[A-Z]$/.test(ch) ? ch : "#";
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(brand);
  }
  const letters = [...ALPHABET.filter((l) => grouped[l]), ...(grouped["#"] ? ["#"] : [])];
  return { grouped, letters };
}

export function DesignersDirectoryClient({
  brands,
  searchPlaceholder,
}: {
  brands: BrandStat[];
  searchPlaceholder: string;
}) {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState("A");

  const filtered = useMemo(() => {
    if (search.trim().length < 2) return brands;
    const q = search.trim().toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const { grouped, letters } = useMemo(() => groupBrands(filtered), [filtered]);

  useEffect(() => {
    if (!letters.includes(activeLetter)) {
      setActiveLetter(letters[0] ?? "A");
    }
  }, [letters, activeLetter]);

  const scrollToLetter = useCallback((letter: string) => {
    const id = letter === "#" ? "designers-hash" : `designers-${letter}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveLetter(letter);
    }
  }, []);

  useEffect(() => {
    if (search.length >= 2) return;
    const sections = letters
      .map((letter) => document.getElementById(letter === "#" ? "designers-hash" : `designers-${letter}`))
      .filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id) return;
        const id = visible.target.id.replace("designers-", "");
        setActiveLetter(id === "hash" ? "#" : id.toUpperCase());
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [letters, search]);

  const isSearching = search.trim().length >= 2;

  return (
    <div className="flex flex-col w-full" data-testid="designers-directory-nap">
      <div className="relative w-full max-w-xl mb-8 md:mb-10">
        <svg
          className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-0 border-b border-border/50 bg-transparent pl-8 pr-4 py-3 text-[11px] uppercase tracking-[0.2em] focus:outline-none focus:border-foreground placeholder:text-muted-foreground/45"
          data-testid="input-search-designers"
        />
      </div>

      {!isSearching && (
        <nav
          className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-y border-border/30 -mx-4 px-4 md:-mx-0 md:px-0 mb-8 md:mb-10"
          aria-label="Browse designers by letter"
        >
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide py-3 md:py-4">
            {ALPHABET.map((letter) => {
              const hasBrands = Boolean(grouped[letter]);
              const active = activeLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasBrands}
                  onClick={() => hasBrands && scrollToLetter(letter)}
                  className={`flex-shrink-0 min-w-[2rem] md:min-w-[2.25rem] text-center text-[13px] md:text-sm pb-2 border-b-2 transition-colors ${
                    active && hasBrands
                      ? "border-foreground text-foreground font-medium"
                      : hasBrands
                        ? "border-transparent text-foreground hover:text-foreground/70"
                        : "border-transparent text-muted-foreground/30 cursor-default"
                  }`}
                  data-testid={`letter-nav-${letter}`}
                >
                  {letter}
                </button>
              );
            })}
            {grouped["#"] && (
              <button
                type="button"
                onClick={() => scrollToLetter("#")}
                className={`flex-shrink-0 min-w-[2rem] text-center text-[13px] pb-2 border-b-2 ${
                  activeLetter === "#" ? "border-foreground text-foreground" : "border-transparent text-foreground"
                }`}
              >
                #
              </button>
            )}
          </div>
        </nav>
      )}

      {isSearching && (
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-6" data-testid="text-search-count">
          {filtered.length} {filtered.length === 1 ? "brand" : "brands"}
        </p>
      )}

      {letters.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">No brands found.</p>
      ) : (
        <div className="flex flex-col gap-12 md:gap-16">
          {letters.map((letter) => (
            <section
              key={letter}
              id={letter === "#" ? "designers-hash" : `designers-${letter}`}
              className="scroll-mt-36"
            >
              {!isSearching && (
                <h2
                  className="text-[40px] md:text-[52px] font-serif leading-none text-foreground mb-6 md:mb-8"
                  style={{ fontFamily: "Playfair Display, serif" }}
                >
                  {letter === "#" ? "#" : letter}
                </h2>
              )}
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-0">
                {grouped[letter].map((brand) => (
                  <li key={brand.slug}>
                    <Link
                      href={`/designers/${brand.slug}`}
                      className="flex items-center gap-2.5 py-3 md:py-3.5 group border-b border-transparent hover:border-border/20"
                      data-testid={`card-shoppable-${brand.slug}`}
                    >
                      <Bookmark
                        className="w-3.5 h-3.5 text-muted-foreground/45 flex-shrink-0 group-hover:text-foreground/60 transition-colors"
                        strokeWidth={1.25}
                      />
                      <span className="text-[14px] md:text-[15px] text-foreground group-hover:text-foreground/75 transition-colors truncate">
                        {brand.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

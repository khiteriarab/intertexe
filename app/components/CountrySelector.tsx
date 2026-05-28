"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import {
  SHIPPING_REGIONS,
  formatRegionLabel,
  getRegionForCountryCode,
  getRegionForMarket,
  type MarketFilter,
  type ShippingRegion,
} from "../../lib/shipping-regions";
import { useShoppingMarket } from "../hooks/use-shopping-market";

export function CountrySelector({
  detectedCountryCode,
  compact = true,
  menuFooter = false,
  className = "",
}: {
  detectedCountryCode?: string;
  compact?: boolean;
  /** Bottom of mobile hamburger menu — subtle label, opens dropdown on tap */
  menuFooter?: boolean;
  className?: string;
}) {
  const { market, setMarket, catalogRegion } = useShoppingMarket();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const detected = getRegionForCountryCode(detectedCountryCode);
  const active = (() => {
    if (market === "us-ca" && catalogRegion === "ca") {
      return SHIPPING_REGIONS.find((r) => r.code === "CA") ?? getRegionForMarket(market);
    }
    if (market === "us-ca") {
      return SHIPPING_REGIONS.find((r) => r.code === "US") ?? getRegionForMarket(market);
    }
    return detected && market === detected.market ? detected : getRegionForMarket(market);
  })();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHIPPING_REGIONS;
    return SHIPPING_REGIONS.filter(
      (r) =>
        r.country.toLowerCase().includes(q) ||
        r.currency.toLowerCase().includes(q) ||
        (r.code || "").toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (region: ShippingRegion) => {
    setMarket(region.market, { countryCode: region.code });
    setOpen(false);
    setQuery("");
  };

  const menuFooterLabel =
    active.code && active.country !== "All destinations"
      ? `${active.code} · ${active.country}`
      : active.country;

  if (menuFooter) {
    return (
      <div
        ref={rootRef}
        className={`relative mt-8 pt-4 border-t border-gray-100 ${className}`}
        data-testid="country-selector-menu-footer"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left text-xs tracking-widest text-gray-400 uppercase hover:text-gray-600 transition-colors py-1"
          aria-expanded={open}
          aria-haspopup="listbox"
          data-testid="button-country-selector"
        >
          {menuFooterLabel}
        </button>
        {open && (
          <div
            className="absolute left-0 right-0 bottom-full mb-2 z-[220] w-full bg-background border border-border/40 shadow-xl"
            role="listbox"
            data-testid="dropdown-country-selector"
          >
            {countryDropdownBody(filtered, active, query, setQuery, pick)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} data-testid="country-selector">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-foreground/80 hover:text-foreground transition-colors py-1"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="button-country-selector"
      >
        <span className="max-w-[140px] md:max-w-[200px] truncate">
          {formatRegionLabel(active, compact)}
        </span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 md:bottom-auto md:mb-0 md:top-full md:mt-2 z-[120] w-[min(100vw-2rem,320px)] bg-background border border-border/40 shadow-xl"
          role="listbox"
          data-testid="dropdown-country-selector"
        >
          {countryDropdownBody(filtered, active, query, setQuery, pick)}
        </div>
      )}
    </div>
  );
}

function countryDropdownBody(
  filtered: ShippingRegion[],
  active: ShippingRegion,
  query: string,
  setQuery: (q: string) => void,
  pick: (region: ShippingRegion) => void
) {
  return (
    <>
      <div className="px-4 py-3 border-b border-border/30">
        <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          Shipping to
        </p>
        <div className="relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full border-0 border-b border-border/40 bg-transparent py-2 pl-6 pr-6 text-[12px] focus:outline-none"
            autoFocus
            data-testid="input-country-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <ul className="max-h-[50vh] overflow-y-auto py-1">
        {filtered.map((region) => (
          <li key={region.country}>
            <button
              type="button"
              onClick={() => pick(region)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-[12px] hover:bg-[#f5f5f3] transition-colors ${
                region.country === active.country
                  ? "text-foreground font-medium"
                  : "text-foreground/75"
              }`}
              data-testid={`country-option-${region.country.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="truncate">{region.country}</span>
              <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
                {region.currency}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-[12px] text-muted-foreground">No matches</li>
        )}
      </ul>
    </>
  );
}

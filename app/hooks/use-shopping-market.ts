"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SHOP_MARKET_EVENT,
  SHOP_MARKET_STORAGE_KEY,
  type MarketFilter,
  marketFromSearchParam,
} from "../../lib/shipping-regions";

const TOKEN_KEY = "intertexe_auth_token";

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const SHOP_MARKET_INVALIDATE = "intertexe-shop-market-invalidate";

export function useShoppingMarket(initial?: MarketFilter) {
  const [market, setMarketState] = useState<MarketFilter>(initial ?? "all");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHOP_MARKET_STORAGE_KEY);
      if (stored === "us-ca" || stored === "eu-uk-me" || stored === "all") {
        setMarketState(stored);
      }
    } catch {}

    const token = getToken();
    if (!token) return;
    fetch("/api/user/preferences", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const m = data?.shopMarket;
        if (m === "us-ca" || m === "eu-uk-me" || m === "all") {
          setMarketState(m);
          localStorage.setItem(SHOP_MARKET_STORAGE_KEY, m);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onExternal = (e: Event) => {
      const detail = (e as CustomEvent<MarketFilter>).detail;
      if (detail === "us-ca" || detail === "eu-uk-me" || detail === "all") {
        setMarketState(detail);
      }
    };
    window.addEventListener(SHOP_MARKET_EVENT, onExternal);
    return () => window.removeEventListener(SHOP_MARKET_EVENT, onExternal);
  }, []);

  const setMarket = useCallback((next: MarketFilter) => {
    setMarketState(next);
    try {
      localStorage.setItem(SHOP_MARKET_STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent(SHOP_MARKET_EVENT, { detail: next }));
    window.dispatchEvent(new CustomEvent(SHOP_MARKET_INVALIDATE, { detail: next }));

    const token = getToken();
    if (token) {
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shopMarket: next }),
      }).catch(() => {});
    }
  }, []);

  return { market, setMarket };
}

export function readMarketFromUrl(search: string | null): MarketFilter {
  if (!search) return "all";
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return marketFromSearchParam(params.get("market"));
}

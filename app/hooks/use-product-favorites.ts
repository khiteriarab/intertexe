"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuthLoginPrompt } from "./use-auth-login-prompt";
import { canonicalProductId } from "../../lib/canonical-product-id";

const STORAGE_KEY = "intertexe_product_favorites";
const TOKEN_KEY = "intertexe_auth_token";

function loadLocal(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocal(favorites: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {}
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function useProductFavorites() {
  const { openLoginPrompt } = useAuthLoginPrompt();
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(new Set());
  const [serverFavorites, setServerFavorites] = useState<string[]>([]);
  const hasSynced = useRef(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
    setLocalFavorites(loadLocal());
    const update = () => setLocalFavorites(loadLocal());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("/api/product-favorites", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { productIds: [] })
      .then((data: any) => {
        const ids: string[] = Array.isArray(data) ? data : (data.productIds || []);
        setServerFavorites(ids);
        if (!hasSynced.current) {
          hasSynced.current = true;
          const local = loadLocal();
          const localViews = (() => {
            try {
              const raw = localStorage.getItem("intertexe_recently_viewed");
              const parsed = raw ? JSON.parse(raw) : [];
              return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
            } catch {
              return [];
            }
          })();

          const favoritesPromise =
            local.size > 0
              ? fetch("/api/product-favorites/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ productIds: [...local] }),
                }).then((r) => (r.ok ? r.json() : null))
              : Promise.resolve(null);

          const activityPromise =
            localViews.length > 0
              ? fetch("/api/user/activity/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ productViews: localViews }),
                }).then((r) => (r.ok ? r.json() : null))
              : Promise.resolve(null);

          Promise.all([favoritesPromise, activityPromise])
            .then(([merged]) => {
              if (merged) {
                const mergedIds: string[] = Array.isArray(merged) ? merged : (merged.productIds || []);
                saveLocal(new Set(mergedIds));
                setLocalFavorites(new Set(mergedIds));
                setServerFavorites(mergedIds);
                notify();
              } else if (ids.length > 0) {
                saveLocal(new Set(ids));
                setLocalFavorites(new Set(ids));
                notify();
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const merged = new Set<string>([
    ...localFavorites,
    ...serverFavorites,
  ]);

  const toggle = useCallback((productRef: string | { id?: string; productId?: string; product_id?: string }, brandName?: string, price?: string) => {
    const productId =
      typeof productRef === "string"
        ? productRef
        : canonicalProductId(productRef);
    if (!productId) return;

    const current = loadLocal();
    const adding = !current.has(productId);

    if (adding && !getToken()) {
      openLoginPrompt();
      return;
    }

    if (adding) {
      current.add(productId);
      if (price) {
        try {
          const alerts = JSON.parse(localStorage.getItem("intertexe_price_alerts") || "{}");
          if (!alerts[productId]) {
            alerts[productId] = price;
            localStorage.setItem("intertexe_price_alerts", JSON.stringify(alerts));
          }
        } catch {}
      }
    } else {
      current.delete(productId);
    }
    saveLocal(current);
    setLocalFavorites(new Set(current));
    notify();

    const token = getToken();
    if (token) {
      if (adding) {
        const priceNum = price ? parseFloat(String(price).replace(/[^0-9.]/g, "")) : null;
        fetch("/api/product-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            productId,
            savedPrice: Number.isFinite(priceNum as number) ? priceNum : null,
          }),
        }).catch(() => {});
      } else {
        fetch(`/api/product-favorites/${encodeURIComponent(productId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [openLoginPrompt]);

  const isFavorited = useCallback(
    (productId: string) => merged.has(productId),
    [merged]
  );

  const count = merged.size;

  return { toggle, isFavorited, count, favorites: merged };
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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
          if (local.size > 0) {
            fetch("/api/product-favorites/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ productIds: [...local] }),
            })
              .then((r) => r.ok ? r.json() : null)
              .then((merged) => {
                if (merged) {
                  saveLocal(new Set(merged));
                  setLocalFavorites(new Set(merged));
                  setServerFavorites(merged);
                  notify();
                }
              })
              .catch(() => {});
          } else if (ids.length > 0) {
            saveLocal(new Set(ids));
            setLocalFavorites(new Set(ids));
            notify();
          }
        }
      })
      .catch(() => {});
  }, []);

  const merged = new Set<string>([
    ...localFavorites,
    ...serverFavorites,
  ]);

  const toggle = useCallback((productId: string, brandName?: string, price?: string) => {
    const current = loadLocal();
    const adding = !current.has(productId);

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
        fetch("/api/product-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId }),
        }).catch(() => {});
      } else {
        fetch(`/api/product-favorites/${encodeURIComponent(productId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, []);

  const isFavorited = useCallback(
    (productId: string) => merged.has(productId),
    [merged]
  );

  const count = merged.size;

  return { toggle, isFavorited, count, favorites: merged };
}

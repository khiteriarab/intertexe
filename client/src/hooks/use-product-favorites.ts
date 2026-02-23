import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "intertexe_product_favorites";

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {}
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function useProductFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  useEffect(() => {
    const update = () => setFavorites(loadFavorites());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const toggle = useCallback((productId: string) => {
    const current = loadFavorites();
    if (current.has(productId)) {
      current.delete(productId);
    } else {
      current.add(productId);
    }
    saveFavorites(current);
    setFavorites(new Set(current));
    notify();
  }, []);

  const isFavorited = useCallback(
    (productId: string) => favorites.has(productId),
    [favorites]
  );

  const count = favorites.size;

  return { toggle, isFavorited, count, favorites };
}

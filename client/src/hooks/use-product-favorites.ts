import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "intertexe_product_favorites";

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

export function useProductFavorites() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const syncedRef = useRef(false);

  const { data: serverFavorites } = useQuery({
    queryKey: ["product-favorites"],
    queryFn: () => api.getProductFavorites(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const [localFavorites, setLocalFavorites] = useState<Set<string>>(loadLocal);

  useEffect(() => {
    const update = () => setLocalFavorites(loadLocal());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !serverFavorites || syncedRef.current) return;
    syncedRef.current = true;

    const local = loadLocal();
    if (local.size > 0) {
      api.syncProductFavorites([...local]).then((merged) => {
        saveLocal(new Set(merged));
        setLocalFavorites(new Set(merged));
        queryClient.setQueryData(["product-favorites"], merged);
        notify();
      }).catch(() => {});
    } else if (serverFavorites.length > 0) {
      saveLocal(new Set(serverFavorites));
      setLocalFavorites(new Set(serverFavorites));
      notify();
    }
  }, [isAuthenticated, serverFavorites, queryClient]);

  useEffect(() => {
    syncedRef.current = false;
  }, [user?.id]);

  const merged = new Set<string>([
    ...localFavorites,
    ...(serverFavorites || []),
  ]);

  const toggle = useCallback((productId: string) => {
    const current = loadLocal();
    const adding = !current.has(productId);

    if (adding) {
      current.add(productId);
    } else {
      current.delete(productId);
    }
    saveLocal(current);
    setLocalFavorites(new Set(current));
    notify();

    if (isAuthenticated) {
      if (adding) {
        api.addProductFavorite(productId).then(() => {
          queryClient.invalidateQueries({ queryKey: ["product-favorites"] });
        }).catch(() => {});
      } else {
        api.removeProductFavorite(productId).then(() => {
          queryClient.invalidateQueries({ queryKey: ["product-favorites"] });
        }).catch(() => {});
      }
    }
  }, [isAuthenticated, queryClient]);

  const isFavorited = useCallback(
    (productId: string) => merged.has(productId),
    [merged]
  );

  const count = merged.size;

  return { toggle, isFavorited, count, favorites: merged };
}

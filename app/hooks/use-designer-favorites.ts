"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthLoginPrompt } from "./use-auth-login-prompt";

const TOKEN_KEY = "intertexe_auth_token";

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function useDesignerFavorites() {
  const { openLoginPrompt } = useAuthLoginPrompt();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoaded(true);
      return;
    }
    fetch("/api/favorites", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { designerId?: string; designerName?: string }[]) => {
        const names = (rows || []).map((r) => r.designerName || r.designerId || "").filter(Boolean);
        setSaved(new Set(names));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const isSaved = useCallback((designerName: string) => saved.has(designerName), [saved]);

  const toggle = useCallback(
    (designerName: string) => {
      const name = designerName.trim();
      if (!name) return;

      const token = getToken();
      const adding = !saved.has(name);

      if (adding && !token) {
        openLoginPrompt();
        return;
      }

      setSaved((prev) => {
        const next = new Set(prev);
        if (adding) next.add(name);
        else next.delete(name);
        return next;
      });

      if (!token) return;

      if (adding) {
        fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ designerId: name }),
        }).catch(() => {});
      } else {
        fetch(`/api/favorites/${encodeURIComponent(name)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    },
    [saved, openLoginPrompt]
  );

  return { toggle, isSaved, loaded, count: saved.size };
}

"use client";

import { useEffect } from "react";

const TOKEN_KEY = "intertexe_auth_token";
const LOCAL_KEY = "intertexe_recently_viewed";

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveLocal(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids.slice(0, 24)));
  } catch {}
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Fire-and-forget product view — local + Supabase when signed in. */
export function ProductViewBeacon({ productId }: { productId: string }) {
  useEffect(() => {
    if (!productId) return;

    const local = loadLocal().filter((id) => id !== productId);
    local.unshift(productId);
    saveLocal(local);

    const token = getToken();
    if (!token) return;

    fetch("/api/user/product-views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  }, [productId]);

  return null;
}

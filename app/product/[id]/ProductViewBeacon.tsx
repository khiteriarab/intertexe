"use client";

import { useEffect } from "react";
import { trackViewContent } from "../../../lib/analytics";

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

function parsePrice(price: string | number | null | undefined): number | null {
  if (price == null) return null;
  const n = typeof price === "number" ? price : parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Fire-and-forget product view — local + Supabase when signed in + Meta ViewContent. */
export function ProductViewBeacon({
  productId,
  contentName,
  price,
  currency,
}: {
  productId: string;
  contentName?: string;
  price?: string | number | null;
  currency?: string | null;
}) {
  useEffect(() => {
    if (!productId) return;

    const local = loadLocal().filter((id) => id !== productId);
    local.unshift(productId);
    saveLocal(local);

    trackViewContent({
      productId,
      contentName,
      value: parsePrice(price),
      currency: currency || "USD",
    });

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
  }, [productId, contentName, price, currency]);

  return null;
}

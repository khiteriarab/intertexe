import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  supabaseGetPriceWatches,
  supabaseSavePriceWatch,
  supabaseRemovePriceWatch,
  supabaseBulkSavePriceWatches,
} from "@/lib/supabase";
import { useEffect, useRef } from "react";

const LOCAL_KEY = "intertexe_price_alerts";

function parsePrice(price: string | null | undefined): number | null {
  if (!price) return null;
  const cleaned = price.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function loadLocalAlerts(): Record<string, string> {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalAlert(productId: string, price: string) {
  try {
    const alerts = loadLocalAlerts();
    if (!alerts[productId]) {
      alerts[productId] = price;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(alerts));
    }
  } catch {}
}

function removeLocalAlert(productId: string) {
  try {
    const alerts = loadLocalAlerts();
    delete alerts[productId];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(alerts));
  } catch {}
}

export function usePriceAlerts() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const hasSynced = useRef<string | null>(null);
  const userId = user?.id;

  const { data: serverAlerts = [] } = useQuery({
    queryKey: ["price-watches", userId],
    queryFn: () => supabaseGetPriceWatches(userId),
    enabled: isAuthenticated && !!userId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (hasSynced.current === userId) return;
    hasSynced.current = userId;

    const local = loadLocalAlerts();
    const items = Object.entries(local).map(([productId, price]) => ({
      productId,
      originalPrice: price,
    }));
    if (items.length > 0) {
      supabaseBulkSavePriceWatches(items, userId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["price-watches", userId] });
      }).catch(() => {});
    }
  }, [isAuthenticated, userId, queryClient]);

  const alertsMap = new Map<string, string>();

  const local = loadLocalAlerts();
  for (const [pid, price] of Object.entries(local)) {
    alertsMap.set(pid, price);
  }
  for (const alert of serverAlerts) {
    alertsMap.set(alert.productId, alert.originalPrice);
  }

  function recordPrice(productId: string, price: string | null | undefined) {
    if (!price) return;
    saveLocalAlert(productId, price);
    if (isAuthenticated && userId) {
      supabaseSavePriceWatch(productId, price, userId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["price-watches", userId] });
      }).catch(() => {});
    }
  }

  function clearAlert(productId: string) {
    removeLocalAlert(productId);
    if (isAuthenticated && userId) {
      supabaseRemovePriceWatch(productId, userId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["price-watches", userId] });
      }).catch(() => {});
    }
  }

  function getPriceDrop(productId: string, currentPrice: string | null | undefined): { hasDrop: boolean; savedPrice: number; currentPrice: number; dropPercent: number } | null {
    const saved = alertsMap.get(productId);
    if (!saved) return null;

    const savedNum = parsePrice(saved);
    const currentNum = parsePrice(currentPrice);
    if (savedNum === null || currentNum === null) return null;
    if (currentNum >= savedNum) return null;

    const dropPercent = Math.round(((savedNum - currentNum) / savedNum) * 100);
    if (dropPercent < 1) return null;

    return {
      hasDrop: true,
      savedPrice: savedNum,
      currentPrice: currentNum,
      dropPercent,
    };
  }

  return { recordPrice, clearAlert, getPriceDrop, alertsMap };
}

"use client";

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

export function usePriceAlerts() {
  const alertsMap = new Map<string, string>();
  const local = loadLocalAlerts();
  for (const [pid, price] of Object.entries(local)) {
    alertsMap.set(pid, price);
  }

  function recordPrice(productId: string, price: string | null | undefined) {
    if (!price) return;
    try {
      const alerts = loadLocalAlerts();
      if (!alerts[productId]) {
        alerts[productId] = price;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(alerts));
      }
    } catch {}
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
    return { hasDrop: true, savedPrice: savedNum, currentPrice: currentNum, dropPercent };
  }

  return { recordPrice, getPriceDrop, alertsMap };
}

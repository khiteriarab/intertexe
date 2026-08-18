export function trackPlatform(eventName: string, params?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const safe = { ...(params || {}) };
  delete (safe as { email?: string }).email;
  window.gtag?.("event", eventName, safe);
}

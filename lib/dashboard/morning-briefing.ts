import type { GoogleDiscoveryMetrics } from "./integration-metrics";
import type { DeterministicInsight } from "./action-center";
import type { HqOverviewMetrics } from "./metrics";
import type { NightlySyncRun } from "./catalog-sync-ops";
import { computePeriodDelta } from "./period-delta";

export type MorningPulseItem = {
  label: string;
  value: string;
  hint?: string | null;
  period?: string;
  href?: string;
  attention?: boolean;
};

function count(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function money(n: number | null | undefined, demo?: boolean) {
  if (demo) return "Demo only";
  if (n == null) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Compact founder pulse — few tiles, clear windows, safe WoW deltas. */
export function buildMorningPulse(input: {
  metrics: HqOverviewMetrics;
  google: GoogleDiscoveryMetrics;
  commerce: {
    revenueConnected?: boolean;
    revenueIsDemo?: boolean;
    commission7d?: number | null;
  };
  syncLatest?: NightlySyncRun | null;
  totalClicks7d: number;
  totalClicksPrev7d?: number | null;
}): MorningPulseItem[] {
  const { metrics: m, google, commerce, syncLatest, totalClicks7d, totalClicksPrev7d } = input;
  const scanDelta = computePeriodDelta(m.scansLast7d.value, m.scansPrev7d.value, {
    periodLabel: "vs prior 7d",
  });
  const clickDelta = computePeriodDelta(totalClicks7d, totalClicksPrev7d ?? null, {
    periodLabel: "vs prior 7d",
  });

  const items: MorningPulseItem[] = [
    {
      label: "Web visitors",
      period: "7d",
      value: count(google.ga4Users7d ?? google.ga4Sessions7d),
      hint: google.connected
        ? google.deltas.users7d.label || google.deltas.sessions7d.label
        : "Google not connected",
      href: "/dashboard/acquisition",
      attention: !google.connected,
    },
    {
      label: "Registrations",
      period: "Today",
      value: count(m.usersToday.value),
      hint: m.usersYesterday.value != null ? `Yesterday ${count(m.usersYesterday.value)}` : null,
      href: "/dashboard/consumers",
    },
    {
      label: "Scans",
      period: "7d",
      value: count(m.scansLast7d.value),
      hint:
        [scanDelta.label, m.scansToday.value != null ? `Today ${count(m.scansToday.value)}` : null]
          .filter(Boolean)
          .join(" · ") || null,
      href: "/dashboard/scanner",
      attention: Boolean(scanDelta.complete && (scanDelta.percent ?? 0) <= -10),
    },
    {
      label: "Affiliate clicks",
      period: "7d",
      value: count(totalClicks7d),
      hint: clickDelta.label,
      href: "/dashboard/commerce",
    },
    {
      label: "Commission",
      period: "7d",
      value: money(
        commerce.revenueConnected && !commerce.revenueIsDemo ? commerce.commission7d : null,
        commerce.revenueIsDemo
      ),
      hint: commerce.revenueIsDemo
        ? "Demo data — replace"
        : !commerce.revenueConnected
          ? "Not connected"
          : null,
      href: "/dashboard/commerce",
      attention: Boolean(commerce.revenueIsDemo || !commerce.revenueConnected),
    },
  ];

  if (syncLatest?.status === "failure" || syncLatest?.status === "warning") {
    items.unshift({
      label: "Catalog sync",
      period: "Latest",
      value: syncLatest.status === "failure" ? "Failed" : "Warning",
      hint: "Needs attention",
      href: "/dashboard/operations",
      attention: true,
    });
  }

  return items;
}

export function buildGreeting(name: string) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${hello}, ${name}.`;
}

export function insightToHighlight(i: DeterministicInsight) {
  return {
    key: i.fingerprint,
    text: `${i.whatChanged} ${i.recommendedAction}`,
    detail: i,
    href: i.href,
    tone:
      i.priority === "critical"
        ? ("attention" as const)
        : i.priority === "growth"
          ? ("positive" as const)
          : ("info" as const),
  };
}

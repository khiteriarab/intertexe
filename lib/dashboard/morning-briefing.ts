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

/** Question-led morning pulse with explicit windows + safe WoW deltas. */
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
      label: "Website visitors",
      period: "Trailing 7d",
      value: count(google.ga4Users7d ?? google.ga4Sessions7d),
      hint: google.connected
        ? google.deltas.users7d.label || google.deltas.sessions7d.label
        : "Connect Google in Settings",
      href: "/dashboard/acquisition",
    },
    {
      label: "New registrations",
      period: "Today",
      value: count(m.usersToday.value),
      hint: m.usersYesterday.value != null ? `Yesterday ${count(m.usersYesterday.value)}` : null,
      href: "/dashboard/consumers",
    },
    {
      label: "Scans",
      period: "Trailing 7d",
      value: count(m.scansLast7d.value),
      hint: scanDelta.label,
      href: "/dashboard/scanner",
    },
    {
      label: "Scans today",
      period: "Today",
      value: count(m.scansToday.value),
      hint: m.scansYesterday.value != null ? `Yesterday ${count(m.scansYesterday.value)}` : null,
      href: "/dashboard/scanner",
    },
    {
      label: "Affiliate clicks",
      period: "Trailing 7d",
      value: count(totalClicks7d),
      hint: clickDelta.label,
      href: "/dashboard/commerce",
    },
    {
      label: "Verified commission",
      period: "Trailing 7d",
      value: money(
        commerce.revenueConnected && !commerce.revenueIsDemo ? commerce.commission7d : null,
        commerce.revenueIsDemo
      ),
      hint: !commerce.revenueConnected && !commerce.revenueIsDemo ? "Not connected" : null,
      href: "/dashboard/commerce",
    },
  ];

  if (syncLatest?.status === "failure" || syncLatest?.status === "warning") {
    items.push({
      label: "Catalog sync",
      period: "Latest run",
      value: syncLatest.status === "failure" ? "Needs attention" : "Warning",
      hint: "Product health",
      href: "/dashboard/operations",
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

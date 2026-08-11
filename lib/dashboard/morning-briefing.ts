import type {
  AppStoreDiscoveryMetrics,
  GoogleDiscoveryMetrics,
  PinterestDiscoveryMetrics,
  TikTokDiscoveryMetrics,
} from "./integration-metrics";
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
  tiktok?: TikTokDiscoveryMetrics;
  pinterest?: PinterestDiscoveryMetrics;
  appStore?: AppStoreDiscoveryMetrics;
  commerce: {
    revenueConnected?: boolean;
    revenueIsDemo?: boolean;
    commission7d?: number | null;
    salesToday?: number | null;
    sales7d?: number | null;
    lastSaleDate?: string | null;
    revenueGoal?: {
      pct?: number;
      progressUsd?: number;
      mode?: string;
      daysToGoal?: number | null;
    } | null;
  };
  syncLatest?: NightlySyncRun | null;
  totalClicks7d: number;
  totalClicksPrev7d?: number | null;
  catalogHealth?: {
    score?: number;
    threshold?: number;
    belowThreshold?: boolean;
    blocked?: boolean;
    smokeOk?: boolean;
    components?: Array<{ key: string; label: string; ok: boolean }>;
  } | null;
}): MorningPulseItem[] {
  const {
    metrics: m,
    google,
    tiktok,
    pinterest,
    appStore,
    commerce,
    syncLatest,
    totalClicks7d,
    totalClicksPrev7d,
    catalogHealth,
  } = input;
  const scanDelta = computePeriodDelta(m.scansLast7d.value, m.scansPrev7d.value, {
    periodLabel: "vs prior 7d",
  });
  const clickDelta = computePeriodDelta(totalClicks7d, totalClicksPrev7d ?? null, {
    periodLabel: "vs prior 7d",
  });

  const items: MorningPulseItem[] = [
    {
      label: "$1M path",
      period: "Goal",
      value:
        commerce.revenueIsDemo || !commerce.revenueConnected
          ? "—"
          : `${Math.round(commerce.revenueGoal?.pct ?? 0)}%`,
      hint:
        commerce.revenueIsDemo
          ? "Demo only"
          : !commerce.revenueConnected
            ? "Connect revenue"
            : commerce.revenueGoal?.daysToGoal != null
              ? `~${commerce.revenueGoal.daysToGoal}d at commission pace`
              : "YTD / annualized commission",
      href: "/dashboard/commerce#revenue-goal",
      attention: Boolean(
        commerce.revenueIsDemo ||
          !commerce.revenueConnected ||
          (commerce.revenueGoal?.pct ?? 0) < 5
      ),
    },
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
      label: "App downloads",
      period: "7d",
      value: count(appStore?.connected && appStore.downloadsReady ? appStore.appUnits7d : null),
      hint: !appStore?.connected
        ? "App Store not connected"
        : !appStore.downloadsReady
          ? "Add Vendor Number"
          : appStore.deltas.appUnits7d.label ||
            (appStore.reportLatestDate ? `Through ${appStore.reportLatestDate}` : "App Units"),
      href: "/dashboard/acquisition",
      attention: !appStore?.connected || !appStore.downloadsReady,
    },
    {
      label: "TikTok views",
      period: "Sample",
      value: count(tiktok?.connected ? tiktok.viewsSample : null),
      hint: !tiktok?.connected
        ? "TikTok not connected"
        : [
            tiktok.deltas.viewsSample.label,
            tiktok.followerCount != null ? `${count(tiktok.followerCount)} followers` : null,
            tiktok.videosPosted7d != null ? `${count(tiktok.videosPosted7d)} posted 7d` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Display API sample",
      href: "/dashboard/acquisition",
      attention: !tiktok?.connected,
    },
    {
      label: "Pinterest",
      period: "7d",
      value: count(pinterest?.connected ? pinterest.impressions7d : null),
      hint: !pinterest?.connected
        ? "Pinterest not connected"
        : [
            pinterest.deltas.impressions7d.label,
            pinterest.outboundClicks7d != null
              ? `${count(pinterest.outboundClicks7d)} outbound`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Organic impressions",
      href: "/dashboard/acquisition",
      attention: !pinterest?.connected,
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
      label: "Sales",
      period: "Today",
      value: money(
        commerce.revenueConnected && !commerce.revenueIsDemo ? commerce.salesToday ?? 0 : null,
        commerce.revenueIsDemo
      ),
      hint: commerce.revenueIsDemo
        ? "Demo data — replace"
        : !commerce.revenueConnected
          ? "Not connected"
          : commerce.lastSaleDate
            ? `Last sale ${commerce.lastSaleDate}${
                commerce.sales7d != null
                  ? ` · 7d $${Math.round(commerce.sales7d).toLocaleString()}`
                  : ""
              }`
            : "No verified sales yet",
      href: "/dashboard/commerce",
      attention: Boolean(
        commerce.revenueIsDemo ||
          !commerce.revenueConnected ||
          (commerce.revenueConnected && (commerce.salesToday ?? 0) <= 0)
      ),
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

  if (catalogHealth?.score != null || catalogHealth?.blocked) {
    const failing = (catalogHealth.components || []).filter((c) => !c.ok).map((c) => c.label);
    items.unshift({
      label: "Catalog Health",
      period: "Live",
      value:
        catalogHealth.blocked
          ? "Blocked"
          : catalogHealth.score != null
            ? `${catalogHealth.score}%`
            : "—",
      hint: failing.length
        ? failing.slice(0, 3).join(" · ")
        : catalogHealth.smokeOk === false
          ? "Smoke failed"
          : catalogHealth.belowThreshold
            ? `Below ${catalogHealth.threshold ?? 95}%`
            : "All clear",
      href: "/dashboard/operations",
      attention: Boolean(
        catalogHealth.blocked || catalogHealth.belowThreshold || catalogHealth.smokeOk === false
      ),
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

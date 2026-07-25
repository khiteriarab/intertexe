import type { HqInsight } from "./insights";
import type { GoogleDiscoveryMetrics } from "./integration-metrics";
import type { HqOverviewMetrics } from "./metrics";
import type { NightlySyncRun } from "./catalog-sync-ops";

export type BriefingHighlight = {
  key: string;
  text: string;
  href?: string;
  tone?: "info" | "positive" | "attention";
};

export type MorningPulseItem = {
  label: string;
  value: string;
  hint?: string | null;
  href?: string;
};

function money(n: number | null | undefined, demo?: boolean) {
  if (demo) return "Demo only";
  if (n == null) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function count(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

/** Question-led morning pulse: growth signals, not API status. */
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
}): MorningPulseItem[] {
  const { metrics: m, google, commerce, syncLatest, totalClicks7d } = input;
  const items: MorningPulseItem[] = [
    {
      label: "Website visitors (7d)",
      value: count(google.ga4Users7d ?? google.ga4Sessions7d),
      hint: google.connected
        ? google.ga4Sessions7d != null
          ? `${count(google.ga4Sessions7d)} sessions`
          : "From Google Analytics"
        : "Connect Google in Settings",
      href: "/dashboard/acquisition",
    },
    {
      label: "New registrations (today)",
      value: count(m.usersToday.value),
      href: "/dashboard/consumers",
    },
    {
      label: "First scans (today)",
      value: count(m.scansToday.value),
      hint: m.scansYesterday.value != null ? `Yesterday ${count(m.scansYesterday.value)}` : null,
      href: "/dashboard/scanner",
    },
    {
      label: "Affiliate clicks (7d)",
      value: count(totalClicks7d),
      href: "/dashboard/commerce",
    },
    {
      label: "Verified commission (7d)",
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
      value: syncLatest.status === "failure" ? "Needs attention" : "Warning",
      hint: "Product health",
      href: "/dashboard/operations",
    });
  }

  return items;
}

/** Readable highlights a founder would actually skim each morning. */
export function buildMorningHighlights(input: {
  metrics: HqOverviewMetrics;
  google: GoogleDiscoveryMetrics;
  insights: HqInsight[];
  commerce: {
    revenueConnected?: boolean;
    revenueIsDemo?: boolean;
    commission7d?: number | null;
    unmatchedTx30d?: number | null;
  };
  syncLatest?: NightlySyncRun | null;
  totalClicks7d: number;
}): BriefingHighlight[] {
  const { metrics: m, google, insights, commerce, syncLatest, totalClicks7d } = input;
  const out: BriefingHighlight[] = [];

  if (google.connected && google.ga4Sessions7d != null) {
    out.push({
      key: "web_demand",
      text: `Website demand (7d): ${count(google.ga4Sessions7d)} sessions · ${count(google.ga4Users7d)} users · ${count(google.ga4PageViews7d)} pageviews.`,
      href: "/dashboard/acquisition",
      tone: "info",
    });
  } else if (!google.connected) {
    out.push({
      key: "web_missing",
      text: "Web discovery is dark — connect Google in Settings so Acquisition can answer how people find INTERTEXE.",
      href: "/dashboard/settings",
      tone: "attention",
    });
  }

  if (google.gscImpressions7d != null || google.gscClicks7d != null) {
    const top = google.gscTopQueries[0]?.query;
    out.push({
      key: "organic",
      text: `Organic search (7d): ${count(google.gscImpressions7d)} impressions · ${count(google.gscClicks7d)} clicks${
        top ? ` · top query “${top}”` : ""
      }.`,
      href: "/dashboard/acquisition",
      tone: google.gscClicks7d && google.gscClicks7d > 0 ? "positive" : "info",
    });
  }

  if (m.topMaterialsLast30d[0]) {
    const mat = m.topMaterialsLast30d[0];
    out.push({
      key: "material_lead",
      text: `${mat.material} leads recent material scans (${mat.scans} in the 30d sample).`,
      href: "/dashboard/materials",
      tone: "positive",
    });
  }

  if (totalClicks7d > 0) {
    out.push({
      key: "commerce_clicks",
      text: `${count(totalClicks7d)} affiliate clicks in the last 7 days — Commerce can reconcile to commission when revenue is verified.`,
      href: "/dashboard/commerce",
      tone: "info",
    });
  }

  if (commerce.revenueIsDemo) {
    out.push({
      key: "revenue_demo",
      text: "Revenue is demo data only — replace with a verified Rakuten report before trusting commercial conclusions.",
      href: "/dashboard/commerce",
      tone: "attention",
    });
  } else if ((commerce.unmatchedTx30d || 0) > 0) {
    out.push({
      key: "unmatched",
      text: `${commerce.unmatchedTx30d} unmatched affiliate transactions in 30d need SKU/product investigation.`,
      href: "/dashboard/commerce",
      tone: "attention",
    });
  }

  if (syncLatest?.status === "failure") {
    out.push({
      key: "sync_fail",
      text: "Nightly catalog sync failed — product health needs attention before merchandising decisions.",
      href: "/dashboard/operations",
      tone: "attention",
    });
  } else if (syncLatest?.status === "warning") {
    out.push({
      key: "sync_warn",
      text: "Nightly catalog sync finished with warnings — review Operations.",
      href: "/dashboard/operations",
      tone: "attention",
    });
  }

  for (const i of insights.filter((x) => x.severity !== "info").slice(0, 2)) {
    out.push({
      key: `insight_${i.key}`,
      text: `${i.title} — ${i.recommendedAction}`,
      href: "/dashboard/insights",
      tone: i.severity === "critical" ? "attention" : "info",
    });
  }

  if (!out.length) {
    out.push({
      key: "awaiting",
      text: "Waiting for stronger signal volume. Keep scanner, web, and commerce emitters healthy.",
      href: "/dashboard/insights",
      tone: "info",
    });
  }

  return out.slice(0, 7);
}

export function buildGreeting(name: string) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${hello}, ${name}.`;
}

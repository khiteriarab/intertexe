import Link from "next/link";
import { requireHqSession } from "../../../lib/dashboard/auth";
import {
  fetchGoogleDiscoveryMetrics,
  fetchPinterestDiscoveryMetrics,
  fetchTikTokDiscoveryMetrics,
  fetchAppStoreDiscoveryMetrics,
} from "../../../lib/dashboard/integration-metrics";
import { formatCount } from "../../../lib/dashboard/metrics";
import { fetchEmailEngineBundle } from "../../../lib/dashboard/email-engine";
import { fetchPaidAcquisitionReport } from "../../../lib/dashboard/paid-acquisition";
import { fetchContentToday } from "../../../lib/dashboard/content-today";
import {
  buildBdBriefing,
  buildMoneyMove,
  fetchAppDownloadClicks,
  fetchDataFreshness,
  fetchFounderToday,
  fetchRevenueSnapshot,
  fetchSourceComparison,
  pct,
  sourceLabel,
} from "../../../lib/dashboard/command-center";
import { OutreachSyncButton } from "./OutreachSyncButton";
import { AppStoreSyncButton } from "./AppStoreSyncButton";
import { PaidAcquisitionSection } from "../components/PaidAcquisitionSection";
import { formatMoneyUsd } from "../../../lib/dashboard/commerce-intelligence";
import { HqCard, HqPageHeader } from "../components/HqUi";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function greetingName(fullName: string | null, email: string) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function throughDate(iso: string | null) {
  if (!iso) return "pending";
  const d = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ago(iso: string | null) {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function Funnel({
  steps,
  note,
}: {
  steps: Array<{ label: string; value: string }>;
  note?: string;
}) {
  return (
    <div>
      <p className="text-sm tabular-nums text-black/80 leading-relaxed">
        {steps.map((s, i) => (
          <span key={s.label}>
            {i > 0 ? <span className="text-black/30"> → </span> : null}
            <span className="text-black/45">{s.label} </span>
            {s.value}
          </span>
        ))}
      </p>
      {note ? <p className="text-[11px] text-black/40 mt-2 leading-relaxed">{note}</p> : null}
    </div>
  );
}

export default async function HqOverviewPage() {
  const session = await requireHqSession();
  const [
    founder,
    revenue,
    google,
    tiktok,
    pinterest,
    appStore,
    emailEngine,
    paidAcquisition,
    contentToday,
    sources,
    freshness,
    appDownloadClicks,
  ] = await Promise.all([
    fetchFounderToday(session.workspaceId),
    fetchRevenueSnapshot(session.workspaceId),
    fetchGoogleDiscoveryMetrics(session.workspaceId),
    fetchTikTokDiscoveryMetrics(session.workspaceId),
    fetchPinterestDiscoveryMetrics(session.workspaceId),
    fetchAppStoreDiscoveryMetrics(session.workspaceId),
    fetchEmailEngineBundle(),
    fetchPaidAcquisitionReport(),
    fetchContentToday(session.workspaceId),
    fetchSourceComparison(),
    fetchDataFreshness(session.workspaceId),
    fetchAppDownloadClicks(session.workspaceId),
  ]);

  const name = greetingName(session.fullName, session.email);
  const f = founder.funnel;
  const cf = founder.bd.canonicalFunnel;
  const briefing = founder.tableReady ? buildBdBriefing(founder) : null;
  const moneyMove = buildMoneyMove({ founder, paid: paidAcquisition });
  const appleReady = appStore.connected && appStore.downloadsReady;
  const revenueOk = revenue.connected && !revenue.isDemo;
  const accountActivation =
    founder.accounts.total && founder.activated.total != null
      ? pct(founder.activated.total || 0, founder.accounts.total || 0)
      : "—";

  const appleFresh = freshness.find((r) => r.id === "apple");
  if (appleFresh) {
    appleFresh.note = appStore.reportLatestDate
      ? `Sales SUMMARY through ${throughDate(appStore.reportLatestDate)} · not real-time`
      : "Apple reports lag 1–2 days";
  }

  return (
    <div>
      <HqPageHeader
        title="Today"
        description={`${name} · How INTERTEXE is growing, where users come from, and what to do next. HQ reports only — contacts stay in Supabase.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">App download clicks</p>
          <p className="text-2xl font-medium tabular-nums mt-1">{formatCount(appDownloadClicks.today)}</p>
          <p className="text-[11px] text-black/45 mt-1">
            First-party CTA · {appDownloadClicks.timezone}
          </p>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">
            7d {formatCount(appDownloadClicks.d7)} · 30d {formatCount(appDownloadClicks.d30)}
          </p>
        </HqCard>
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Apple App Units</p>
          <p className="text-2xl font-medium tabular-nums mt-1">
            {appleReady ? formatCount(appStore.appUnitsLatestDay) : "—"}
          </p>
          <p className="text-[11px] text-black/45 mt-1">
            Apple report · through {appleReady ? throughDate(appStore.reportLatestDate) : "—"}
          </p>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">
            7d {appleReady ? formatCount(appStore.appUnits7d) : "—"} · 30d{" "}
            {appleReady ? formatCount(appStore.appUnits30d) : "—"}
            {appStore.deltas.appUnits7d.label ? ` · ${appStore.deltas.appUnits7d.label}` : ""}
          </p>
          <div className="mt-2">
            <AppStoreSyncButton
              connected={appStore.connected}
              downloadsReady={appStore.downloadsReady}
              syncedAt={appStore.syncedAt || appStore.lastSuccessfulSyncAt}
            />
          </div>
        </HqCard>
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">New accounts</p>
          <p className="text-2xl font-medium tabular-nums mt-1">{formatCount(founder.accounts.today)}</p>
          <p className="text-[11px] text-black/45 mt-1">Supabase signup · {founder.timezone}</p>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">
            7d {formatCount(founder.accounts.d7)} · 30d {formatCount(founder.accounts.d30)}
          </p>
        </HqCard>
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Activated users</p>
          <p className="text-2xl font-medium tabular-nums mt-1">{formatCount(founder.activated.today)}</p>
          <p className="text-[11px] text-black/45 mt-1">First scan · {accountActivation} of accounts</p>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">
            7d {formatCount(founder.activated.d7)} · lifetime {formatCount(founder.activated.total)}
          </p>
        </HqCard>
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Retailer clicks</p>
          <p className="text-2xl font-medium tabular-nums mt-1">{formatCount(founder.clicks.today)}</p>
          <p className="text-[11px] text-black/45 mt-1">Shop + scanner + editorial</p>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">
            7d {formatCount(founder.clicks.d7)} · 30d {formatCount(founder.clicks.d30)}
          </p>
        </HqCard>
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Revenue</p>
          <p className="text-2xl font-medium tabular-nums mt-1">
            {revenueOk ? formatMoneyUsd(revenue.commissionToday) : "—"}
          </p>
          <p className="text-[11px] text-black/45 mt-1">
            {revenueOk ? `Affiliate commission · today · ${founder.timezone}` : "Rakuten not verified"}
          </p>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">
            7d {revenueOk ? formatMoneyUsd(revenue.commission7d) : "—"} · month{" "}
            {revenueOk ? formatMoneyUsd(revenue.commission30d) : "—"}
            {revenue.lastSaleDate ? ` · last ${throughDate(revenue.lastSaleDate)}` : ""}
          </p>
        </HqCard>
      </div>

      <HqCard className="mb-6" title="Company funnel">
        <Funnel
          steps={[
            { label: "App Download Clicks", value: formatCount(appDownloadClicks.d7) },
            { label: "Apple App Units", value: appleReady ? formatCount(appStore.appUnits7d) : "—" },
            { label: "Accounts", value: formatCount(founder.accounts.d7) },
            { label: "Activated", value: formatCount(founder.activated.d7) },
            { label: "Retailer clicks", value: formatCount(founder.clicks.d7) },
            { label: "Commission", value: revenueOk ? formatMoneyUsd(revenue.commission7d) : "—" },
          ]}
          note={`7-day operating view · ${founder.timezone}. These are different metrics — do not conflate them: App Download Click = first-party CTA toward App Store or /open; Apple App Unit = Apple Sales SUMMARY download (delayed, not user-level attribution); Account = Supabase signup; Activated = first scan. Apple through ${throughDate(appStore.reportLatestDate)}. Account → activated ${accountActivation}.`}
        />
      </HqCard>

      <HqCard className="mb-6" title="App download clicks">
        <p className="text-[11px] text-black/45 mb-3 leading-relaxed">
          First-party CTA clicks only (website /open and App Store links). Not Apple App Units. Not accounts.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 text-sm mb-4">
          {(
            [
              ["Website", appDownloadClicks.byChannel.website],
              ["Meta", appDownloadClicks.byChannel.meta],
              ["TikTok", appDownloadClicks.byChannel.tiktok],
              ["Email", appDownloadClicks.byChannel.email],
              ["QR / sticker", appDownloadClicks.byChannel.qr],
              ["Other", appDownloadClicks.byChannel.other],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
              <span className="text-black/55">{label}</span>
              <span className="tabular-nums font-medium">{formatCount(value)}</span>
            </div>
          ))}
        </div>
        {appDownloadClicks.bySourceCampaign.length > 0 ? (
          <div className="overflow-x-auto">
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">By source / campaign · 30d</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-black/40 border-b border-black/10">
                  <th className="py-1.5 font-normal">Source</th>
                  <th className="py-1.5 font-normal">Campaign</th>
                  <th className="py-1.5 font-normal">Channel</th>
                  <th className="py-1.5 font-normal text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {appDownloadClicks.bySourceCampaign.map((row) => (
                  <tr key={`${row.source}-${row.campaign}-${row.channel}`} className="border-b border-black/5">
                    <td className="py-1.5">{row.source}</td>
                    <td className="py-1.5">{row.campaign}</td>
                    <td className="py-1.5 capitalize text-black/55">{row.channel === "qr" ? "QR / sticker" : row.channel}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatCount(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-black/45">
            No tagged CTA clicks in the last 30 days yet. Meta / TikTok / email / QR need{" "}
            <code className="text-xs">utm_*</code> on{" "}
            <code className="text-xs">/open</code> destinations.
          </p>
        )}
      </HqCard>

      {briefing ? (
        <HqCard className="mb-6" title={briefing.title}>
          <p className="text-sm text-black/70 leading-relaxed">{briefing.lines[0]}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-3">
            {[
              ["Introductions to send", Math.min(founder.outreach.remainingToday, founder.bd.introductionsDue)],
              ["Follow-ups due", founder.bd.followUpsDue],
              ["Replies need you", founder.bd.repliesNeedAttention],
              ["High-value attention", founder.bd.highValueAttention],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
                <span className="text-black/55">{label}</span>
                <span className="tabular-nums font-medium">{value as number}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-black/45 mt-3 leading-relaxed">{briefing.lines[3]}</p>
          <p className="text-sm text-black/70 mt-2 leading-relaxed">{briefing.priority}</p>
          <p className="text-[11px] text-black/40 mt-2">
            System queues who needs Gmail. It does not send relationship emails.
          </p>
        </HqCard>
      ) : null}

      <HqCard className="mb-6" title="Business development">
        <p className="text-2xl font-medium tabular-nums tracking-tight">
          {founder.tableReady ? founder.outreach.sentToday : "—"}
          <span className="text-sm font-normal text-black/40"> / {founder.outreach.targetToday} sent</span>
        </p>
        <p className="text-sm text-black/50 mt-1 tabular-nums">
          {founder.outreach.remainingToday} remaining of {founder.outreach.targetToday} · {founder.bd.introductionsDue}{" "}
          introductions waiting · {founder.timezone}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-3">
          {[
            ["Influencers sent", founder.outreach.influencer],
            ["Customers sent", founder.outreach.customer],
            ["Businesses sent", founder.outreach.business],
            ["Brands sent", founder.outreach.brand],
            ["Replies today", founder.outreach.repliesToday],
            ["Follow-ups due", founder.bd.followUpsDue],
            ["Accounts from contacts", founder.accountsFromContactsToday],
            ["Activated from contacts", founder.activatedFromContactsToday],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
              <span className="text-black/55">{label}</span>
              <span className="tabular-nums font-medium">{value as number}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-4">
          <p className="col-span-2 md:col-span-4 text-[10px] tracking-[0.14em] uppercase text-black/40">This week</p>
          {[
            ["Contacted", founder.bd.weekContacted],
            ["Replies", founder.bd.weekReplies],
            ["Accounts", founder.bd.weekAccounts],
            ["Activated", founder.bd.weekActivated],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
              <span className="text-black/55">{label}</span>
              <span className="tabular-nums font-medium">
                {value as number}
                {label === "Replies" && founder.bd.weekContacted >= 8
                  ? ` · ${pct(founder.bd.weekReplies, founder.bd.weekContacted)}`
                  : ""}
                {label === "Accounts" && founder.bd.weekContacted >= 8
                  ? ` · ${pct(founder.bd.weekAccounts, founder.bd.weekContacted)}`
                  : ""}
                {label === "Activated" && founder.bd.weekContacted >= 8
                  ? ` · ${pct(founder.bd.weekActivated, founder.bd.weekContacted)}`
                  : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-4">
          <p className="col-span-2 md:col-span-4 text-[10px] tracking-[0.14em] uppercase text-black/40">
            Conversations waiting
          </p>
          {[
            ["Influencers", founder.bd.opportunities.influencer],
            ["Brands", founder.bd.opportunities.brand],
            ["Organizations", founder.bd.opportunities.organization],
            ["Press", founder.bd.opportunities.press],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
              <span className="text-black/55">{label}</span>
              <span className="tabular-nums font-medium">{value as number}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-black/40">
            Gmail headers only · target 25 is configurable in hq_metric_definitions
          </p>
          <OutreachSyncButton connected={founder.gmailConnected} />
        </div>
      </HqCard>

      <HqCard className="mb-6" title="BD funnel">
        <Funnel
          steps={[
            { label: "Discovered", value: formatCount(cf.discovered || f.imported) },
            { label: "Targeted", value: formatCount(cf.targeted || f.imported) },
            { label: "Contacted", value: formatCount(cf.contacted || f.emailed) },
            { label: "Engaged", value: formatCount(cf.engaged || f.replied) },
            { label: "Acquired", value: formatCount(cf.acquired || f.accounts) },
            { label: "Activated", value: formatCount(cf.activated || f.activated) },
            { label: "Engaged user", value: formatCount(cf.engagedUser) },
            { label: "Commercial", value: formatCount(cf.commercial || f.retailerClicked) },
          ]}
          note="Account creation is the deterministic conversion. Engaged user = 2+ scans. Commercial = retailer click. Not claimed as app download."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-4">
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Contacted → reply</span>
            <span className="tabular-nums font-medium">{pct(cf.engaged || f.replied, cf.contacted || f.emailed)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Contacted → account</span>
            <span className="tabular-nums font-medium">
              {pct(f.contactedBecameUsers, cf.contacted || f.emailed)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Account → activated</span>
            <span className="tabular-nums font-medium">{pct(cf.activated || f.activated, cf.acquired || f.accounts)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Contacted → activated</span>
            <span className="tabular-nums font-medium">{pct(cf.activated || f.activated, cf.contacted || f.emailed)}</span>
          </div>
        </div>
      </HqCard>

      <HqCard className="mb-6" title="Outreach by type">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase tracking-wider text-black/40">
              <tr>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Contacted</th>
                <th className="py-2 pr-3">Replied</th>
                <th className="py-2 pr-3">Accounts</th>
                <th className="py-2">Activated</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Influencers", founder.byType.influencer],
                  ["Customers", founder.byType.customer],
                  ["Businesses", founder.byType.business],
                  ["Brands", founder.byType.brand],
                ] as const
              ).map(([label, row]) => (
                <tr key={label} className="border-t border-black/5">
                  <td className="py-2 pr-3">{label}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.contacted}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.replied}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.accounts}</td>
                  <td className="py-2 tabular-nums">{row.activated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-black/40 mt-2">Individual people stay in Supabase Table Editor → hq_contacts.</p>
      </HqCard>

      {founder.bd.bySource.length ? (
        <HqCard className="mb-6" title="BD source">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Discovered</th>
                  <th className="py-2 pr-3">Contacted</th>
                  <th className="py-2 pr-3">Accounts</th>
                  <th className="py-2">Activated</th>
                </tr>
              </thead>
              <tbody>
                {founder.bd.bySource.map((row) => (
                  <tr key={row.source || "unknown"} className="border-t border-black/5">
                    <td className="py-2 pr-3">{sourceLabel(row.source)}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.discovered}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.contacted}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.accounts}</td>
                    <td className="py-2 tabular-nums">{row.activated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-black/40 mt-2">
            Contacted → account is shown only as counts until a source has n≥8 contacted.
          </p>
        </HqCard>
      ) : null}

      <PaidAcquisitionSection report={paidAcquisition} compact />

      <HqCard className="mb-6" title="Which channels create users">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase tracking-wider text-black/40">
              <tr>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Accounts</th>
                <th className="py-2 pr-3">Activated</th>
                <th className="py-2 pr-3">Retailer clicks</th>
                <th className="py-2">Commission</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-t border-black/5">
                  <td className="py-2 pr-3">{s.label}</td>
                  <td className="py-2 pr-3 tabular-nums">{s.accounts}</td>
                  <td className="py-2 pr-3 tabular-nums">{s.activated}</td>
                  <td className="py-2 pr-3 tabular-nums">{s.clicks}</td>
                  <td className="py-2 tabular-nums">{s.revenue == null ? "—" : formatMoneyUsd(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-black/40 mt-2">
          First-party only. Paid install attribution is not claimed. Organic TikTok sample {formatCount(tiktok.connected ? tiktok.viewsSample : null)} views
          {google.connected ? ` · Web 7d ${formatCount(google.ga4Users7d ?? google.ga4Sessions7d)}` : ""}
          {pinterest.connected ? ` · Pinterest 7d ${formatCount(pinterest.impressions7d)}` : ""}.
        </p>
      </HqCard>

      <HqCard className="mb-6" title="Content today">
        <div className="grid grid-cols-2 gap-x-4 text-sm">
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Due today</span>
            <span className="tabular-nums font-medium">{contentToday.dueToday}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">In pipeline</span>
            <span className="tabular-nums font-medium">{contentToday.inPipeline}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Link href="/dashboard/content" className="text-[11px] tracking-widest uppercase underline underline-offset-4">
            Content →
          </Link>
        </div>
      </HqCard>

      <HqCard className="mb-6" title="Email today">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          {emailEngine.today.byProgram.map((row) => (
            <div key={row.emailType} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
              <span className="text-black/55">{row.label}</span>
              <span className="tabular-nums font-medium">
                {row.status === "ACTIVE" ? row.sentToday ?? 0 : "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Link href="/dashboard/email" className="text-[11px] tracking-widest uppercase underline underline-offset-4">
            Email Engine →
          </Link>
        </div>
      </HqCard>

      {moneyMove ? (
        <HqCard className="mb-6" title={moneyMove.title}>
          <p className="text-sm text-black/70 leading-relaxed">{moneyMove.body}</p>
        </HqCard>
      ) : null}

      <HqCard className="mb-6" title="Data freshness">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          {freshness.map((row) => (
            <div key={row.id} className="border-b border-black/5 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-black/55">{row.label}</span>
                <span className={`tabular-nums ${row.stale ? "text-amber-800" : "font-medium"}`}>
                  {row.stale ? "stale" : ago(row.at)}
                </span>
              </div>
              {row.note ? <p className="text-[11px] text-black/40 mt-0.5">{row.note}</p> : null}
            </div>
          ))}
        </div>
      </HqCard>
    </div>
  );
}

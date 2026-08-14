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
  buildMoneyMove,
  fetchDataFreshness,
  fetchFounderToday,
  fetchRevenueSnapshot,
  fetchSourceComparison,
  pct,
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
  ]);

  const name = greetingName(session.fullName, session.email);
  const f = founder.funnel;
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <HqCard>
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">App downloads</p>
          <p className="text-2xl font-medium tabular-nums mt-1">
            {appleReady ? formatCount(appStore.appUnitsLatestDay) : "—"}
          </p>
          <p className="text-[11px] text-black/45 mt-1">
            Apple · through {appleReady ? throughDate(appStore.reportLatestDate) : "—"}
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
          <p className="text-[11px] text-black/45 mt-1">Supabase Auth · {founder.timezone}</p>
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
            { label: "Downloads", value: appleReady ? formatCount(appStore.appUnits7d) : "—" },
            { label: "Accounts", value: formatCount(founder.accounts.d7) },
            { label: "Activated", value: formatCount(founder.activated.d7) },
            { label: "Scans", value: formatCount(founder.scans.d7) },
            { label: "Clicks", value: formatCount(founder.clicks.d7) },
            { label: "Commission", value: revenueOk ? formatMoneyUsd(revenue.commission7d) : "—" },
          ]}
          note={`7-day operating view · ${founder.timezone}. Apple App Units are delayed aggregate Sales SUMMARY (through ${throughDate(appStore.reportLatestDate)}), not user-level install attribution. Account → activated ${accountActivation}.`}
        />
      </HqCard>

      <HqCard className="mb-6" title="Outreach today">
        <p className="text-2xl font-medium tabular-nums tracking-tight">
          {founder.tableReady ? founder.outreach.sentToday : "—"}
          <span className="text-sm font-normal text-black/40"> / {founder.outreach.targetToday} sent</span>
        </p>
        <p className="text-sm text-black/50 mt-1 tabular-nums">
          {founder.outreach.remainingToday} remaining · {founder.timezone}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-3">
          {[
            ["Influencers", founder.outreach.influencer],
            ["Customers", founder.outreach.customer],
            ["Businesses", founder.outreach.business],
            ["Brands", founder.outreach.brand],
            ["Replies", founder.outreach.repliesToday],
            ["Follow-ups due", founder.followUpsDue],
            ["Accounts from contacts", founder.accountsFromContactsToday],
            ["Activated from contacts", founder.activatedFromContactsToday],
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

      <HqCard className="mb-6" title="Outreach funnel">
        <Funnel
          steps={[
            { label: "Imported", value: formatCount(f.imported) },
            { label: "Emailed", value: formatCount(f.emailed) },
            { label: "Replied", value: formatCount(f.replied) },
            { label: "Account", value: formatCount(f.accounts) },
            { label: "Activated", value: formatCount(f.activated) },
            { label: "Retailer", value: formatCount(f.retailerClicked) },
          ]}
          note="Account creation is the deterministic conversion. Not claimed as app download."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-4">
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Contacted → reply</span>
            <span className="tabular-nums font-medium">{pct(f.replied, f.emailed)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Contacted → account</span>
            <span className="tabular-nums font-medium">{pct(f.contactedBecameUsers, f.emailed)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Account → activated</span>
            <span className="tabular-nums font-medium">{pct(f.activated, f.accounts)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Contacted → activated</span>
            <span className="tabular-nums font-medium">{pct(f.activated, f.emailed)}</span>
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

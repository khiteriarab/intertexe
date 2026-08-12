import Link from "next/link";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import {
  fetchHqAcquisitionReport,
  type AcquisitionBucket,
} from "../../../../lib/dashboard/acquisition";
import { fetchGoogleDiscoveryMetrics, fetchPinterestDiscoveryMetrics, fetchTikTokDiscoveryMetrics, fetchAppStoreDiscoveryMetrics } from "../../../../lib/dashboard/integration-metrics";
import { fetchPaidAcquisitionReport } from "../../../../lib/dashboard/paid-acquisition";
import { formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../components/HqUi";
import { PaidAcquisitionSection } from "../../components/PaidAcquisitionSection";

export const metadata = { title: "Acquisition" };
export const dynamic = "force-dynamic";

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function days(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(1)}d`;
}

function ReportTable({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: AcquisitionBucket[];
  emptyHint: string;
}) {
  if (!rows.length) {
    return (
      <HqCard title={title}>
        <p className="text-sm text-black/50">{emptyHint}</p>
      </HqCard>
    );
  }
  return (
    <HqCard title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-black/40">
            <tr>
              <th className="py-2 pr-3 font-medium">Dimension</th>
              <th className="py-2 pr-3 font-medium">Customers</th>
              <th className="py-2 pr-3 font-medium">Purchasers</th>
              <th className="py-2 pr-3 font-medium">Conv%</th>
              <th className="py-2 pr-3 font-medium">Revenue</th>
              <th className="py-2 pr-3 font-medium">Commission</th>
              <th className="py-2 pr-3 font-medium">Rev/cust</th>
              <th className="py-2 pr-3 font-medium">Avg order</th>
              <th className="py-2 pr-3 font-medium">CLV</th>
              <th className="py-2 pr-3 font-medium">Reg→buy</th>
              <th className="py-2 pr-3 font-medium">Scans/buy</th>
              <th className="py-2 font-medium">Favs/buy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const conv =
                row.customers > 0 ? (row.purchasers / row.customers) * 100 : null;
              const revPerCustomer =
                row.customers > 0 ? row.sales / row.customers : null;
              return (
              <tr key={row.key} className="border-t border-black/5">
                <td className="py-2 pr-3 max-w-[200px] truncate" title={row.label}>
                  {row.label}
                </td>
                <td className="py-2 pr-3 tabular-nums">{formatCount(row.customers)}</td>
                <td className="py-2 pr-3 tabular-nums">{formatCount(row.purchasers)}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {conv == null ? "—" : `${conv.toFixed(1)}%`}
                </td>
                <td className="py-2 pr-3 tabular-nums">{money(row.sales)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.commission)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(revPerCustomer)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.avgOrder)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.lifetimeValue)}</td>
                <td className="py-2 pr-3 tabular-nums">{days(row.avgDaysToPurchase)}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {row.avgScansBeforePurchase == null ? "—" : row.avgScansBeforePurchase.toFixed(1)}
                </td>
                <td className="py-2 tabular-nums">
                  {row.avgFavoritesBeforePurchase == null
                    ? "—"
                    : row.avgFavoritesBeforePurchase.toFixed(1)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HqCard>
  );
}

export default async function HqAcquisitionPage() {
  const session = await requireHqSession();
  const [report, paidAcquisition, google, tiktok, pinterest, appStore] = await Promise.all([
    fetchHqAcquisitionReport(),
    fetchPaidAcquisitionReport(),
    fetchGoogleDiscoveryMetrics(session.workspaceId),
    fetchTikTokDiscoveryMetrics(session.workspaceId),
    fetchPinterestDiscoveryMetrics(session.workspaceId),
    fetchAppStoreDiscoveryMetrics(session.workspaceId),
  ]);

  return (
    <div>
      <HqPageHeader
        title="Acquisition"
        description="How are people discovering INTERTEXE — and which sources convert to revenue? Use this when Action Center points here."
        action={
          <Link
            href="/dashboard"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Back to Today
          </Link>
        }
      />

      <div id="paid-acquisition">
        <PaidAcquisitionSection report={paidAcquisition} />
      </div>

      <HqCard className="mb-6" title="App Store downloads">
        {appStore.connected ? (
          <>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-3">
              App Units from App Store Connect Sales SUMMARY · trailing 7d vs prior 7d
            </p>
            <HqMetricGrid
              items={[
                {
                  label: "Downloads (7d)",
                  value: formatCount(appStore.appUnits7d),
                  hint: appStore.deltas.appUnits7d.label || "App Units",
                },
                {
                  label: "Downloads (30d)",
                  value: formatCount(appStore.appUnits30d),
                  hint: appStore.reportLatestDate
                    ? `Through ${appStore.reportLatestDate}`
                    : "App Units",
                },
                {
                  label: "Latest report day",
                  value: formatCount(appStore.appUnitsLatestDay),
                  hint: appStore.reportLatestDate || "Sales lag 1–2 days",
                },
                {
                  label: "Apps visible",
                  value: formatCount(appStore.appsVisible),
                  hint: appStore.appNames.slice(0, 2).join(", ") || "ASC apps list",
                },
              ]}
            />
            {appStore.daily.length ? (
              <div className="mt-5">
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Daily App Units (recent)
                </p>
                <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
                  {[...appStore.daily].reverse().map((d) => (
                    <li key={d.date} className="flex justify-between gap-3">
                      <span className="tabular-nums text-black/60">{d.date}</span>
                      <span className="tabular-nums font-medium">{formatCount(d.appUnits)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {appStore.setupWarnings.length ? (
              <p className="text-sm text-amber-900 mt-4">{appStore.setupWarnings.join(" · ")}</p>
            ) : null}
            {!appStore.downloadsReady ? (
              <p className="text-sm text-black/60 mt-4 leading-relaxed">
                API key is connected, but downloads need your Vendor Number. Reconnect in Settings and add it, then Sync
                Now.
              </p>
            ) : null}
            <p className="text-[11px] text-black/40 mt-4">
              Synced {appStore.syncedAt ? new Date(appStore.syncedAt).toLocaleString() : "—"}
              {appStore.lastSyncStatus ? ` · ${appStore.lastSyncStatus}` : ""}
              {" · "}
              <Link href="/dashboard/settings" className="underline underline-offset-2">
                Manage connection
              </Link>
            </p>
          </>
        ) : (
          <div className="text-sm text-black/60 leading-relaxed">
            <p>
              App Store Connect is not connected, so iOS downloads are dark. Upload a team .p8 API key and Vendor Number
              in Settings — this page will show App Units (downloads).
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Open Settings → Integrations
            </Link>
          </div>
        )}
      </HqCard>

      <HqCard className="mb-6" title="Web discovery (Google)">
        {google.connected ? (
          <>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-3">
              Trailing 7d vs prior 7d · Today / 30d where available
            </p>
            <HqMetricGrid
              items={[
                {
                  label: "Sessions (7d)",
                  value: formatCount(google.ga4Sessions7d),
                  hint: google.deltas.sessions7d.label || "GA4",
                },
                {
                  label: "Users (7d)",
                  value: formatCount(google.ga4Users7d),
                  hint: google.deltas.users7d.label || "GA4",
                },
                {
                  label: "Organic clicks (7d)",
                  value: formatCount(google.gscClicks7d),
                  hint: google.deltas.gscClicks7d.label || "Search Console",
                },
                {
                  label: "Organic impressions (7d)",
                  value: formatCount(google.gscImpressions7d),
                  hint: google.deltas.gscImpressions7d.label || "Search Console",
                },
              ]}
            />
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Sessions today</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(google.ga4SessionsToday)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Users (30d)</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(google.ga4Users30d)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Engagement rate (7d)</p>
                <p className="tabular-nums font-medium mt-1">
                  {google.ga4EngagementRate7d == null
                    ? "—"
                    : `${(google.ga4EngagementRate7d * 100).toFixed(1)}%`}
                </p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Conversions (7d)</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(google.ga4Conversions7d)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Avg CTR (7d)</p>
                <p className="tabular-nums font-medium mt-1">
                  {google.gscCtr7d == null ? "—" : `${(google.gscCtr7d * 100).toFixed(1)}%`}
                </p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Avg position (7d)</p>
                <p className="tabular-nums font-medium mt-1">
                  {google.gscAvgPosition7d == null ? "—" : google.gscAvgPosition7d.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Top landing pages (7d)
                </p>
                {google.ga4TopLandingPages.length ? (
                  <ul className="space-y-2 text-sm">
                    {google.ga4TopLandingPages.map((p, i) => (
                      <li key={`${p.page}-${i}`} className="flex justify-between gap-3">
                        <span className="truncate" title={p.page}>
                          {p.page}
                        </span>
                        <span className="tabular-nums text-black/50 shrink-0">
                          {formatCount(p.sessions)} sess
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-black/50">No landing pages in latest sync yet.</p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Top sources / medium (7d)
                </p>
                {google.ga4TopSources.length ? (
                  <ul className="space-y-2 text-sm">
                    {google.ga4TopSources.map((s, i) => (
                      <li key={`${s.sourceMedium}-${i}`} className="flex justify-between gap-3">
                        <span className="truncate">{s.sourceMedium}</span>
                        <span className="tabular-nums text-black/50 shrink-0">
                          {formatCount(s.sessions)} sess
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-black/50">No sources in latest sync yet.</p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Top search queries (7d)
                </p>
                {google.gscTopQueries.length ? (
                  <ul className="space-y-2 text-sm">
                    {google.gscTopQueries.map((q, i) => (
                      <li key={`${q.query || "q"}-${i}`} className="flex justify-between gap-3">
                        <span className="truncate">{q.query || "—"}</span>
                        <span className="tabular-nums text-black/50 shrink-0">
                          {formatCount(q.clicks ?? null)} / {formatCount(q.impressions ?? null)}
                          {q.position ? ` · pos ${Number(q.position).toFixed(1)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-black/50">No query rows in the latest sync yet.</p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Top search pages (7d)
                </p>
                {google.gscTopPages.length ? (
                  <ul className="space-y-2 text-sm">
                    {google.gscTopPages.map((p, i) => (
                      <li key={`${p.page || "p"}-${i}`} className="flex justify-between gap-3">
                        <span className="truncate" title={p.page}>
                          {p.page || "—"}
                        </span>
                        <span className="tabular-nums text-black/50 shrink-0">
                          {formatCount(p.clicks ?? null)} clk
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-black/50">No page rows in the latest sync yet.</p>
                )}
              </div>
            </div>

            {google.gscQueryChanges.length ? (
              <div className="mt-5">
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Meaningful query changes (7d vs prior 7d)
                </p>
                <ul className="space-y-2 text-sm">
                  {google.gscQueryChanges.map((c) => (
                    <li key={c.query} className="flex justify-between gap-3">
                      <span className="truncate">{c.query}</span>
                      <span className="tabular-nums text-black/50 shrink-0">
                        {c.deltaClicks == null
                          ? "—"
                          : `${c.deltaClicks > 0 ? "+" : ""}${c.deltaClicks} clicks`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-[11px] text-black/40 mt-4">
              Synced {google.syncedAt ? new Date(google.syncedAt).toLocaleString() : "—"}
              {google.lastSyncStatus ? ` · ${google.lastSyncStatus}` : ""}
              {" · "}
              <Link href="/dashboard/settings" className="underline underline-offset-2">
                Manage connection
              </Link>
              {" · Run Sync Now after deploy to refresh landing pages / sources"}
            </p>
          </>
        ) : (
          <div className="text-sm text-black/60 leading-relaxed">
            <p>
              Google is not connected, so web discovery is dark. Connect once in Settings — this page
              will show sessions, users, organic clicks, impressions, landing pages, and sources.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Open Settings → Integrations
            </Link>
          </div>
        )}
      </HqCard>

      <HqCard className="mb-6" title="Social discovery (TikTok)">
        {tiktok.connected ? (
          <>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-3">
              Display / Login Kit · lifetime totals on latest video sample · vs prior sync
            </p>
            <HqMetricGrid
              items={[
                {
                  label: "Views (sample)",
                  value: formatCount(tiktok.viewsSample),
                  hint: tiktok.deltas.viewsSample.label || "vs prior sync",
                },
                {
                  label: "Likes (sample)",
                  value: formatCount(tiktok.likesSample),
                },
                {
                  label: "Followers",
                  value: formatCount(tiktok.followerCount),
                  hint: tiktok.username ? `@${tiktok.username}` : tiktok.displayName || undefined,
                },
                {
                  label: "Posted (7d)",
                  value: formatCount(tiktok.videosPosted7d),
                  hint: tiktok.deltas.videosPosted7d.label || "create_time window",
                },
              ]}
            />
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Comments (sample)</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(tiktok.commentsSample)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Shares (sample)</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(tiktok.sharesSample)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Videos in sample</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(tiktok.videoSampleCount)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Account videos</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(tiktok.videoCount)}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                Top videos by views
              </p>
              {tiktok.topVideos.length ? (
                <ul className="space-y-2 text-sm">
                  {tiktok.topVideos.slice(0, 8).map((v) => (
                    <li key={v.id} className="flex justify-between gap-3">
                      <span className="truncate" title={v.title}>
                        {v.shareUrl ? (
                          <a
                            href={v.shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {v.title}
                          </a>
                        ) : (
                          v.title
                        )}
                      </span>
                      <span className="tabular-nums text-black/50 shrink-0">
                        {formatCount(v.viewCount)} views · {formatCount(v.likeCount)} likes
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-black/50">No videos in the latest sync yet.</p>
              )}
            </div>

            <p className="text-[11px] text-black/40 mt-4">
              Synced {tiktok.syncedAt ? new Date(tiktok.syncedAt).toLocaleString() : "—"}
              {tiktok.lastSyncStatus ? ` · ${tiktok.lastSyncStatus}` : ""}
              {tiktok.apiSurface ? ` · ${tiktok.apiSurface}` : ""}
              {" · "}
              <Link href="/dashboard/settings" className="underline underline-offset-2">
                Manage connection
              </Link>
            </p>
          </>
        ) : (
          <div className="text-sm text-black/60 leading-relaxed">
            <p>
              TikTok is not connected, so organic social discovery is dark. Connect Login Kit in
              Settings — this page will show sample views, likes, followers, and top videos next to
              Google.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Open Settings → Integrations
            </Link>
          </div>
        )}
      </HqCard>

      <HqCard className="mb-6" title="Social discovery (Pinterest)">
        {pinterest.connected ? (
          <>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-3">
              Organic user_account analytics · trailing 7d vs prior 7d
            </p>
            <HqMetricGrid
              items={[
                {
                  label: "Impressions (7d)",
                  value: formatCount(pinterest.impressions7d),
                  hint: pinterest.deltas.impressions7d.label || undefined,
                },
                {
                  label: "Outbound clicks (7d)",
                  value: formatCount(pinterest.outboundClicks7d),
                  hint: pinterest.deltas.outboundClicks7d.label || undefined,
                },
                {
                  label: "Pin clicks (7d)",
                  value: formatCount(pinterest.pinClicks7d),
                },
                {
                  label: "Saves (7d)",
                  value: formatCount(pinterest.saves7d),
                  hint: pinterest.username ? `@${pinterest.username}` : undefined,
                },
              ]}
            />
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Engagement (7d)</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(pinterest.engagement7d)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Profile visits (7d)</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(pinterest.profileVisits7d)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Followers</p>
                <p className="tabular-nums font-medium mt-1">{formatCount(pinterest.followerCount)}</p>
              </div>
              <div className="border border-black/10 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40">Pins / boards</p>
                <p className="tabular-nums font-medium mt-1">
                  {formatCount(pinterest.pinCount)} / {formatCount(pinterest.boardCount)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                Top pins by impressions (7d)
              </p>
              {pinterest.topPins.length ? (
                <ul className="space-y-2 text-sm">
                  {pinterest.topPins.slice(0, 8).map((p) => (
                    <li key={p.pinId} className="flex justify-between gap-3">
                      <span className="truncate" title={p.title || p.pinId}>
                        {p.link ? (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {p.title || p.pinId}
                          </a>
                        ) : (
                          p.title || p.pinId
                        )}
                      </span>
                      <span className="tabular-nums text-black/50 shrink-0">
                        {formatCount(p.impression)} imp · {formatCount(p.outboundClick)} out
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-black/50">No top pins in the latest sync yet.</p>
              )}
            </div>

            <p className="text-[11px] text-black/40 mt-4">
              Synced {pinterest.syncedAt ? new Date(pinterest.syncedAt).toLocaleString() : "—"}
              {pinterest.lastSyncStatus ? ` · ${pinterest.lastSyncStatus}` : ""}
              {pinterest.apiSurface ? ` · ${pinterest.apiSurface}` : ""}
              {" · "}
              <Link href="/dashboard/settings" className="underline underline-offset-2">
                Manage connection
              </Link>
            </p>
          </>
        ) : (
          <div className="text-sm text-black/60 leading-relaxed">
            <p>
              Pinterest is not connected, so organic pin discovery is dark. Connect your Business
              account in Settings — this page will show impressions, outbound clicks, saves, and top
              pins next to Google and TikTok.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Open Settings → Integrations
            </Link>
          </div>
        )}
      </HqCard>

      {report.error ? <HqEmptyState title="Could not load acquisition" body={report.error} /> : null}

      <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">
        First-touch → customers & revenue
      </p>
      <HqMetricGrid
        items={[
          { label: "Customers", value: formatCount(report.totals.customers) },
          {
            label: "With attribution",
            value: formatCount(report.totals.withAttribution),
            hint: `${formatCount(report.totals.unknown)} Unknown`,
          },
          {
            label: "Attributed revenue",
            value: money(report.totals.sales),
            hint: `${formatCount(report.totals.purchasers)} purchasers · ${
              report.totals.customers > 0
                ? `${((report.totals.purchasers / report.totals.customers) * 100).toFixed(1)}% conv`
                : "—"
            }`,
          },
          {
            label: "Commission",
            value: money(report.totals.commission),
            hint:
              report.totals.customers > 0
                ? `${money(report.totals.sales / report.totals.customers)} rev/customer`
                : undefined,
          },
        ]}
      />

      <div className="mt-6 space-y-4">
        <ReportTable
          title="Revenue by acquisition source"
          rows={report.bySource}
          emptyHint="No customer preference rows yet."
        />
        <ReportTable
          title="Revenue by campaign"
          rows={report.byCampaign}
          emptyHint="No campaign UTMs stored yet — new signups will populate this."
        />
        <ReportTable
          title="Revenue by landing page"
          rows={report.byLandingPage}
          emptyHint="No first landing pages captured yet."
        />
        <ReportTable
          title="Revenue by influencer (utm_content)"
          rows={report.byInfluencer}
          emptyHint="No influencer content tags yet. Pass utm_content on campaign links."
        />
        <ReportTable
          title="Revenue by QR code"
          rows={report.byQrCode}
          emptyHint="No QR codes in attribution_extra yet. iOS/web can store qr_code_id without a schema change."
        />
      </div>
    </div>
  );
}

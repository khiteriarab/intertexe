import { requireHqSession } from "../../../../lib/dashboard/auth";
import {
  fetchFounderReports,
  fetchNightlySyncOps,
  formatDuration,
  statusBadgeClass,
} from "../../../../lib/dashboard/catalog-sync-ops";
import { formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Product" };
export const dynamic = "force-dynamic";

export default async function HqOperationsPage() {
  await requireHqSession();
  const [ops, reports] = await Promise.all([fetchNightlySyncOps(), fetchFounderReports()]);
  const latest = ops.latest;

  return (
    <div>
      <HqPageHeader
        title="Product health"
        description="Is the catalog healthy? Nightly sync history, feed outcomes, alert delivery, and founder weekly reports."
      />

      <HqCard title="Nightly Catalog Sync — latest" className="mb-6">
        {latest ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`text-[11px] tracking-widest uppercase border px-2 py-1 ${statusBadgeClass(
                  latest.status
                )}`}
              >
                {latest.displayStatus || latest.status || "Unknown"}
              </span>
              {latest.githubRunUrl ? (
                <a
                  href={latest.githubRunUrl}
                  className="text-xs tracking-widest uppercase underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub Actions run →
                </a>
              ) : null}
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Metric label="Last run" value={fmtTime(latest.finishedAt)} />
              <Metric label="Last success" value={fmtTime(ops.lastSuccessfulAt)} />
              <Metric label="Duration" value={formatDuration(latest.durationMs)} />
              <Metric label="Next scheduled" value={fmtTime(ops.nextScheduledRun)} />
              <Metric label="Files discovered" value={formatCount(latest.totalCatalogFiles ?? null)} />
              <Metric label="Files processed" value={formatCount(latest.filesProcessed ?? null)} />
              <Metric label="Inserted" value={formatCount(latest.inserted ?? null)} />
              <Metric label="Updated" value={formatCount(latest.updated ?? null)} />
              <Metric label="Rejected" value={formatCount(latest.rejected ?? null)} />
              <Metric label="Designers synced" value={formatCount(latest.designersSynced ?? null)} />
              <Metric
                label="Checkpoint"
                value={`${latest.checkpointBefore ?? "—"} → ${latest.checkpointAfter ?? "—"}`}
              />
              <Metric
                label="Email alert"
                value={
                  latest.emailSent
                    ? "Sent"
                    : latest.emailError
                      ? `Failed (${latest.emailError.slice(0, 40)})`
                      : latest.status === "success"
                        ? "Not needed"
                        : "Not sent"
                }
              />
            </div>
            {(latest.errors?.length || latest.warnings?.length) ? (
              <div className="text-sm space-y-1">
                {(latest.errors || []).map((e) => (
                  <p key={e} className="text-red-800">
                    Error: {e}
                  </p>
                ))}
                {(latest.warnings || []).map((w) => (
                  <p key={w} className="text-amber-900">
                    Warning: {w}
                  </p>
                ))}
                {latest.suggestedNextStep ? (
                  <p className="text-black/55 mt-2">Next step: {latest.suggestedNextStep}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-black/50">
            No nightly sync log yet. The next GitHub Actions run will populate this card.
          </p>
        )}
      </HqCard>

      <HqCard title="Sync history" className="mb-6">
        {ops.runs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">When (UTC)</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Files</th>
                  <th className="py-2 pr-3 font-medium">Ins / Upd / Rej</th>
                  <th className="py-2 pr-3 font-medium">Designers</th>
                  <th className="py-2 pr-3 font-medium">Checkpoint</th>
                  <th className="py-2 font-medium">Run</th>
                </tr>
              </thead>
              <tbody>
                {ops.runs.slice(0, 30).map((r) => (
                  <tr key={r.id || r.finishedAt} className="border-t border-black/5">
                    <td className="py-2 pr-3 whitespace-nowrap text-black/55">
                      {r.finishedAt ? new Date(r.finishedAt).toISOString().replace("T", " ").slice(0, 19) : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${statusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {r.filesProcessed ?? "—"}/{r.totalCatalogFiles ?? "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {r.inserted ?? 0} / {r.updated ?? 0} / {r.rejected ?? 0}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{r.designersSynced ?? 0}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {r.checkpointBefore ?? "—"} → {r.checkpointAfter ?? "—"}
                    </td>
                    <td className="py-2">
                      {r.githubRunUrl ? (
                        <a href={r.githubRunUrl} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-black/50">No sync history stored yet.</p>
        )}
      </HqCard>

      <HqCard title="Founder reports">
        {reports.length ? (
          <ul className="space-y-5">
            {reports.slice(0, 12).map((r) => {
              const cat = (r.catalog || {}) as Record<string, unknown>;
              const com = (r.commerce || {}) as Record<string, unknown>;
              const cons = (r.consumers || {}) as Record<string, unknown>;
              const acq = (r.acquisition || {}) as Record<string, unknown>;
              return (
                <li key={r.id} className="border-t border-black/5 pt-4 first:border-0 first:pt-0">
                  <p className="text-sm font-medium">{r.subject}</p>
                  <p className="text-xs text-black/45 mt-1">
                    Week {r.weekStart?.slice(0, 10)} → {r.weekEnd?.slice(0, 10)} · Generated{" "}
                    {r.generatedAt ? new Date(r.generatedAt).toUTCString() : "—"}
                    {r.emailSent ? " · Email sent" : r.emailError ? " · Email failed" : ""}
                  </p>
                  <div className="mt-3 grid sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-black/70">
                    <span>
                      Syncs OK / attn: {String(cat.successfulSyncs ?? "—")} /{" "}
                      {String(cat.failedOrWarningSyncs ?? "—")}
                    </span>
                    <span>
                      Products +{String(cat.newProducts ?? 0)} / ~{String(cat.updatedProducts ?? 0)}
                    </span>
                    <span>
                      Sales 7d:{" "}
                      {com.grossSales != null
                        ? Number(com.grossSales).toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })
                        : "—"}
                    </span>
                    <span>Regs 7d: {String(cons.registrations ?? "—")}</span>
                    <span>Scans 7d: {String(cons.scans7d ?? "—")}</span>
                    <span>Clickouts 7d: {String(cons.affiliateClickouts7d ?? "—")}</span>
                    <span>
                      Attributable sales:{" "}
                      {acq.attributableRevenue != null
                        ? Number(acq.attributableRevenue).toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })
                        : "—"}
                    </span>
                    <span>Unknown attrib: {String(acq.unknownAttributionCustomers ?? "—")}</span>
                  </div>
                  {r.warnings?.length ? (
                    <ul className="mt-2 text-sm text-amber-900 list-disc pl-4">
                      {r.warnings.slice(0, 6).map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-black/50">
            Weekly founder reports appear here after the Monday briefing cron runs
            (`/api/cron/hq-weekly-briefing`, Mondays 07:00 UTC).
          </p>
        )}
      </HqCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 rounded-lg px-3 py-2">
      <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">{label}</p>
      <p className="text-sm font-medium mt-1 tabular-nums break-words">{value}</p>
    </div>
  );
}

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return "—";
  }
}

import Link from "next/link";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import {
  fetchEmailEngineBundle,
  type EmailProgramMetrics,
} from "../../../../lib/dashboard/email-engine";
import { HqCard, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Email" };
export const dynamic = "force-dynamic";

function cellCount(v: number | null): string {
  if (v == null) return "—";
  return String(v);
}

function statusBadge(status: EmailProgramMetrics["status"]) {
  if (status === "ACTIVE") {
    return (
      <span className="text-[10px] tracking-widest uppercase border border-emerald-600/30 text-emerald-800 bg-emerald-50 px-2 py-0.5">
        Active
      </span>
    );
  }
  if (status === "PLANNED") {
    return (
      <span className="text-[10px] tracking-widest uppercase border border-amber-500/40 text-amber-900 bg-amber-50 px-2 py-0.5">
        Planned
      </span>
    );
  }
  return (
    <span className="text-[10px] tracking-widest uppercase border border-black/15 text-black/45 px-2 py-0.5">
      Inactive
    </span>
  );
}

export default async function HqEmailPage() {
  await requireHqSession();
  const engine = await fetchEmailEngineBundle();
  const t = engine.statusTotals;

  return (
    <div>
      <HqPageHeader
        title="Email Engine"
        description="Canonical ledger is email_deliveries (Resend Day 4/10/25 + Loops Founder Welcome when enabled). Gmail founder outreach / replies stay separate."
      />

      <HqCard className="mb-6" title="Delivery outcomes (7d)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Sent", value: t.sent7d },
            { label: "Delivered", value: t.delivered7d },
            { label: "Bounced", value: t.bounced7d },
            { label: "Failed", value: t.failed7d },
            { label: "Complained", value: t.complained7d },
            { label: "Sent today", value: t.sentToday },
            { label: "Delivered today", value: t.deliveredToday },
            { label: "Bounced today", value: t.bouncedToday },
          ].map((item) => (
            <div key={item.label} className="border border-black/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] tracking-widest uppercase text-black/35">{item.label}</p>
              <p className="text-xl font-medium tabular-nums mt-1">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-black/40 mt-3">
          Source: <code className="text-[10px]">email_deliveries</code>
          {engine.openClickTracked
            ? ""
            : " · Open / click not tracked (webhook covers delivered / bounced / complained / failed only)"}
          {" · "}
          Updated {new Date(engine.fetchedAt).toLocaleString()}
        </p>
      </HqCard>

      <HqCard className="mb-6" title="Lifecycle funnel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead>
              <tr className="text-[10px] tracking-widest uppercase text-black/40 border-b border-black/10">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Sent Today</th>
                <th className="py-2 pr-3 font-medium">Sent 7D</th>
                <th className="py-2 pr-3 font-medium">Delivered</th>
                <th className="py-2 pr-3 font-medium">Open</th>
                <th className="py-2 pr-3 font-medium">Click</th>
                <th className="py-2 pr-3 font-medium">Conversion</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {engine.programs.map((row) => (
                <tr key={row.emailType} className="border-b border-black/5">
                  <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{cellCount(row.sentToday)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{cellCount(row.sent7d)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{cellCount(row.delivered7d)}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-black/35">
                    {row.openRate == null ? "—" : `${row.openRate}%`}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-black/35">
                    {row.clickRate == null ? "—" : `${row.clickRate}%`}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-black/35">
                    {row.conversion == null ? "—" : String(row.conversion)}
                  </td>
                  <td className="py-2.5">{statusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-black/40 mt-3">
          Planned / Inactive programs show — instead of fake zeros. Delivered column is last 7 days.
        </p>
      </HqCard>

      <HqCard className="mb-6" title="Recent deliveries">
        {engine.recent.length === 0 ? (
          <p className="text-sm text-black/50">No deliveries in the last 7 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[680px]">
              <thead>
                <tr className="text-[10px] tracking-widest uppercase text-black/40 border-b border-black/10">
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">To</th>
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {engine.recent.map((row) => (
                  <tr key={row.id} className="border-b border-black/5">
                    <td className="py-2 pr-3 font-mono text-[11px]">{row.emailType}</td>
                    <td className="py-2 pr-3 truncate max-w-[220px]">{row.email}</td>
                    <td className="py-2 pr-3 text-[11px] text-black/50">{row.provider || "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.status}</td>
                    <td className="py-2 pr-3 text-black/50 text-[11px]">{row.source || "—"}</td>
                    <td className="py-2 text-[11px] text-black/50">
                      {new Date(row.sentAt || row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HqCard>

      <p className="text-[11px] text-black/40">
        <Link href="/dashboard" className="underline underline-offset-4">
          ← Today
        </Link>
        {" · "}
        Replies are not counted here — they come from Gmail / inbox, not the ESP webhook.
      </p>
    </div>
  );
}

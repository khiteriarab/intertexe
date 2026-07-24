"use client";

import { FormEvent, useState } from "react";
import { HqCard } from "../../components/HqUi";

export function RevenueImportClient({
  revenueConnected,
  revenueIsDemo = false,
  commission7d,
  sales7d,
  transactions7d,
  commission30d,
  sales30d,
}: {
  revenueConnected: boolean;
  revenueIsDemo?: boolean;
  commission7d: number | null;
  sales7d: number | null;
  transactions7d: number | null;
  commission30d: number | null;
  sales30d: number | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/dashboard/revenue/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");
      setMessage(
        `Imported ${data.upserted} of ${data.rowsSeen} rows (skipped ${data.skipped}). Refresh to see totals.`
      );
      form.reset();
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFtpPull() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/revenue/pull", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.reason || "Pull failed");
      setMessage(data.message || `FTP pull: imported ${data.imported}`);
    } catch (err: any) {
      setError(err.message || "Pull failed");
    } finally {
      setBusy(false);
    }
  }

  const money = (n: number | null) =>
    n == null
      ? "—"
      : n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <HqCard title="Verified revenue">
        <ul className="space-y-2 text-sm text-black/70">
          <li className="flex justify-between gap-3">
            <span>Status</span>
            <span>
              {revenueIsDemo
                ? "Demo data only"
                : revenueConnected
                  ? "Connected"
                  : "Not connected — import a report"}
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Commission (7d)</span>
            <span className="tabular-nums">{revenueIsDemo ? "—" : money(commission7d)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Sales (7d)</span>
            <span className="tabular-nums">{revenueIsDemo ? "—" : money(sales7d)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Transactions (7d)</span>
            <span className="tabular-nums">{revenueIsDemo ? "—" : transactions7d ?? "—"}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Commission (30d)</span>
            <span className="tabular-nums">{revenueIsDemo ? "—" : money(commission30d)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Sales (30d)</span>
            <span className="tabular-nums">{revenueIsDemo ? "—" : money(sales30d)}</span>
          </li>
        </ul>
        {revenueIsDemo ? (
          <p className="mt-4 text-xs text-amber-900/80 leading-relaxed">
            Demo data is excluded from these totals. Replace with verified affiliate reporting.
          </p>
        ) : null}
      </HqCard>

      <HqCard title="Import Rakuten report">
        <p className="text-sm text-black/55 leading-relaxed mb-4">
          Upload a transaction CSV, or pull verified rows from the Rakuten Reporting API (when{" "}
          <code className="text-[11px]">RAKUTEN_REPORTS_URL</code> is set) — FTP is catalog-only for most
          accounts.
        </p>
        <form onSubmit={onUpload} className="space-y-3">
          <input
            type="file"
            name="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
            required
            className="block w-full text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              {busy ? "Working…" : "Import file"}
            </button>
            <button
              type="button"
              onClick={onFtpPull}
              disabled={busy}
              className="text-xs tracking-widest uppercase border border-black/15 px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              Pull from Rakuten
            </button>
          </div>
        </form>
        {message ? <p className="text-sm text-black/60 mt-3">{message}</p> : null}
        {error ? <p className="text-sm text-red-700 mt-3">{error}</p> : null}
      </HqCard>
    </div>
  );
}

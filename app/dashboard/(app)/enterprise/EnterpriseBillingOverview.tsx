"use client";

import { useEffect, useState } from "react";

type HqBillingOverview = {
  organizationCount: number;
  mrrEstimate: number;
  arrEstimate: number;
  unpaidActivePublish: number;
  atPassportLimit: Array<{ slug: string; name: string; publishedPassports: number; passportAllowance: number | null }>;
  atProductLimit: Array<{ slug: string; name: string; activeProducts: number; productAllowance: number | null }>;
  unpaidWithPublish: Array<{ slug: string; name: string; invoiceStatus: string | null; plan: string }>;
};

export function EnterpriseBillingOverview() {
  const [data, setData] = useState<HqBillingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/enterprise/billing")
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Failed to load billing overview");
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-900">
        Billing overview unavailable: {error}
      </section>
    );
  }
  if (!data) {
    return <p className="text-sm text-black/45">Loading enterprise billing…</p>;
  }

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 space-y-4" data-testid="hq-enterprise-billing">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-black/50">Enterprise billing</h2>
        <p className="text-xs text-black/45 mt-1">Paddle-synced plans, allowance limits, and manual contract MRR.</p>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Organizations" value={String(data.organizationCount)} />
        <Stat label="MRR (est.)" value={`$${data.mrrEstimate.toLocaleString()}`} />
        <Stat label="ARR (est.)" value={`$${data.arrEstimate.toLocaleString()}`} />
        <Stat label="Unpaid + publish" value={String(data.unpaidActivePublish)} />
      </div>
      {data.atPassportLimit.length ? (
        <LimitList
          title="At passport allowance"
          rows={data.atPassportLimit.map((r) => `${r.name} (${r.slug}) — ${r.publishedPassports}/${r.passportAllowance ?? "∞"}`)}
        />
      ) : null}
      {data.atProductLimit.length ? (
        <LimitList
          title="At product allowance"
          rows={data.atProductLimit.map((r) => `${r.name} (${r.slug}) — ${r.activeProducts}/${r.productAllowance ?? "∞"}`)}
        />
      ) : null}
      {data.unpaidWithPublish.length ? (
        <LimitList
          title="Published but invoice not paid"
          rows={data.unpaidWithPublish.map(
            (r) => `${r.name} (${r.slug}) — ${r.plan} · ${r.invoiceStatus || "unpaid"}`
          )}
        />
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/8 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-black/40">{label}</p>
      <p className="text-lg font-serif mt-1">{value}</p>
    </div>
  );
}

function LimitList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-black/45 mb-2">{title}</h3>
      <ul className="text-sm space-y-1 text-black/70">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </div>
  );
}

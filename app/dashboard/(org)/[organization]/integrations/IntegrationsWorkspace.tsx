import Link from "next/link";
import type { IntegrationRow } from "../../../../../lib/enterprise/module-queries";

const STATE_LABELS: Record<IntegrationRow["state"], string> = {
  connected: "Connected",
  available: "Available",
  not_configured: "Not configured",
  coming_soon: "Coming later",
};

export function IntegrationsWorkspace({ rows }: { rows: IntegrationRow[]; slug: string }) {
  const sustainability = rows.filter((row) => row.category === "Sustainability");
  const platform = rows.filter((row) => row.category !== "Sustainability");

  return (
    <div className="space-y-10">
      <section>
        <p className="ent-section-eyebrow">Sustainability providers</p>
        <h2 className="ent-section-title mt-1">Impact data sources</h2>
        <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-2xl">
          Connect specialist sustainability outputs to product records. Credentials are customer-supplied — INTERTEXE
          does not assume ownership of third-party data.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {sustainability.map((row) => (
            <IntegrationCard key={row.id} row={row} />
          ))}
        </div>
      </section>

      <section>
        <p className="ent-section-eyebrow">Platform</p>
        <h2 className="ent-section-title mt-1">Data & delivery</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {platform.map((row) => (
            <IntegrationCard key={row.id} row={row} />
          ))}
        </div>
      </section>

      <p className="text-xs text-[var(--ent-muted-light)]">
        Live provider sync requires configured credentials and partner authorization. Connect actions open setup — no
        integrations are faked when credentials are absent.
      </p>
    </div>
  );
}

function IntegrationCard({ row }: { row: IntegrationRow }) {
  const action = row.actionLabel || (row.state === "connected" ? "Manage" : row.state === "coming_soon" ? "Coming later" : "Connect");
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--ent-ink)]">{row.label}</p>
          <p className="text-xs text-[var(--ent-muted)] mt-1">{row.detail}</p>
        </div>
        <span className={`ent-status-pill ${row.state === "connected" ? "ent-status-pill--positive" : row.state === "coming_soon" ? "ent-status-pill--warning" : ""}`}>
          {STATE_LABELS[row.state]}
        </span>
      </div>
      <span className="ent-insight-action mt-4">{action} →</span>
    </>
  );

  if (row.href && row.state !== "coming_soon") {
    return (
      <Link href={row.href} className="ent-card ent-card-secondary block p-5 hover:shadow-[var(--ent-shadow-lift)] transition-shadow">
        {body}
      </Link>
    );
  }

  return <article className="ent-card ent-card-secondary p-5 opacity-90">{body}</article>;
}

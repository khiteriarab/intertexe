"use client";

import { useEffect, useState } from "react";
import { formatOperatorTime } from "../../../../../lib/enterprise/reviewer-display";
import { entButtonGhostClass } from "../../../components/EnterpriseUi";

type Connection = {
  id: string;
  integration_key: string;
  label: string | null;
  status: string;
  last_success_at: string | null;
  last_error: string | null;
  recentRuns: Array<{ id: string; status: string; started_at: string; finished_at: string | null }>;
};

export function IntegrationsHealthPanel({ slug }: { slug: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const res = await fetch(`/api/dashboard/org/${slug}/integrations/health`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setConnections(data.connections || []);
  }

  useEffect(() => {
    void refresh();
  }, [slug]);

  async function retry(connectionId: string) {
    await fetch(`/api/dashboard/org/${slug}/integrations/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", connectionId }),
    });
    await refresh();
  }

  if (loading) return null;
  if (connections.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-sm font-semibold mb-3">Connection health</h3>
      <div className="space-y-3">
        {connections.map((connection) => (
          <div key={connection.id} className="rounded-xl border border-[var(--ent-border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{connection.label || connection.integration_key}</p>
                <p className="text-sm text-[var(--ent-muted)] mt-1">
                  Status {connection.status}
                  {connection.last_success_at ? ` · Last sync ${formatOperatorTime(connection.last_success_at)}` : ""}
                </p>
                {connection.last_error ? (
                  <p className="text-xs text-[var(--ent-raspberry)] mt-2">{connection.last_error}</p>
                ) : null}
              </div>
              <button type="button" className={entButtonGhostClass} onClick={() => retry(connection.id)}>
                Retry sync
              </button>
            </div>
            {connection.recentRuns?.length ? (
              <ul className="mt-3 text-xs text-[var(--ent-muted-light)] space-y-1">
                {connection.recentRuns.slice(0, 3).map((run) => (
                  <li key={run.id}>
                    {run.status} · {formatOperatorTime(run.started_at)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

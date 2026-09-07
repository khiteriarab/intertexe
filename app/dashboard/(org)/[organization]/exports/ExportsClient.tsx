"use client";

import { useState } from "react";

export function ExportsClient({ organization }: { organization: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function exportKind(kind: "products" | "issues" | "passports" | "audit_logs") {
    setStatus(`Exporting ${kind}…`);
    const res = await fetch(`/api/dashboard/org/${organization}/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.message || "Export failed.");
      return;
    }
    setStatus(`Exported ${data.rowCount} rows${data.snapshotId ? `. Snapshot ${String(data.snapshotId).slice(0, 8)}…` : "."}`);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ent-muted)]">Governed exports for portability and compliance review.</p>
      <div className="flex flex-wrap gap-2">
        {(["products", "issues", "passports", "audit_logs"] as const).map((kind) => (
          <button key={kind} type="button" className="ent-btn ent-btn-secondary text-sm" onClick={() => exportKind(kind)}>
            Export {kind.replace("_", " ")}
          </button>
        ))}
      </div>
      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}

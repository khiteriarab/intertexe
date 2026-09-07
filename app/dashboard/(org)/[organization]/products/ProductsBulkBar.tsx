"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { entButtonClass, entButtonGhostClass } from "../../../components/EnterpriseUi";

type ProductOption = { id: string; name: string; passport_state: string };

export function ProductsBulkBar({
  slug,
  products,
  canMutate,
}: {
  slug: string;
  products: ProductOption[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const eligible = useMemo(
    () => products.filter((product) => product.passport_state !== "published"),
    [products]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canMutate || eligible.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(action: "approve_fields" | "archive_products") {
    if (!selected.size) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        productIds: Array.from(selected),
        reason: action === "approve_fields" ? "Bulk approval from catalog" : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Bulk update failed.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-xl border border-[var(--ent-border)] bg-[var(--ent-surface-muted)]/40 p-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-sm text-[var(--ent-muted)]">{selected.size} selected</span>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            className={entButtonClass}
            disabled={busy || selected.size === 0}
            onClick={() => run("approve_fields")}
          >
            Approve fields
          </button>
          <button
            type="button"
            className={entButtonGhostClass}
            disabled={busy || selected.size === 0}
            onClick={() => run("archive_products")}
          >
            Archive
          </button>
        </div>
      </div>
      <ul className="space-y-2 max-h-40 overflow-y-auto">
        {eligible.map((product) => (
          <li key={product.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(product.id)}
              onChange={() => toggle(product.id)}
              className="mt-1"
            />
            <span className="text-[var(--ent-ink-soft)] line-clamp-1">{product.name}</span>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-[var(--ent-raspberry)] mt-3">{message}</p> : null}
    </div>
  );
}

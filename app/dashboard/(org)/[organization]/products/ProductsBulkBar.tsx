"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { entButtonClass, entButtonGhostClass } from "../../../components/EnterpriseUi";

type ProductOption = {
  id: string;
  name: string;
  passport_state: string | null;
  openIssueCount?: number;
  blockingIssueCount?: number;
};

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-sm text-[var(--ent-muted)]">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
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
        <ul className="w-full lg:w-auto lg:min-w-[min(100%,22rem)] lg:max-w-md lg:ml-auto space-y-2 max-h-40 overflow-y-auto border-t border-[var(--ent-border)]/70 pt-3 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4">
          {eligible.map((product) => (
            <li key={product.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggle(product.id)}
                className="mt-1 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="text-[var(--ent-ink-soft)] line-clamp-1">{product.name}</span>
                {product.openIssueCount ? (
                  <span className="block text-[11px] text-[var(--ent-raspberry)] mt-0.5">
                    {product.openIssueCount} issue{product.openIssueCount === 1 ? "" : "s"}
                    {product.blockingIssueCount ? ` · ${product.blockingIssueCount} priority` : ""}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {message ? <p className="text-sm text-[var(--ent-raspberry)] mt-3">{message}</p> : null}
    </div>
  );
}

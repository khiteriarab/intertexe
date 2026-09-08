"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { entButtonClass, entButtonGhostClass, entLabelClass } from "../../../components/EnterpriseUi";
import type { DataCarrierRow } from "../../../../../lib/enterprise/carriers";

const CARRIER_LABELS: Record<string, string> = {
  qr: "QR code",
  nfc: "NFC tag",
  rfid: "RFID",
};

function stateTone(state: string): string {
  if (state === "active") return "text-emerald-700 bg-emerald-50";
  if (state === "draft") return "text-amber-800 bg-amber-50";
  return "text-neutral-500 bg-neutral-100";
}

export function ProductCarriersPanel({
  slug,
  productId,
  canMutate,
  carriers,
  publishReady,
}: {
  slug: string;
  productId: string;
  canMutate: boolean;
  carriers: DataCarrierRow[];
  publishReady: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function provision(type: "qr" | "nfc" | "rfid") {
    setBusy(type);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/products/${productId}/carriers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provision", carrierType: type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not provision carrier.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not provision carrier.");
    } finally {
      setBusy(null);
    }
  }

  async function retire(carrierId: string) {
    setBusy(carrierId);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/products/${productId}/carriers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retire", carrierId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not retire carrier.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retire carrier.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="ent-float-card p-6 md:p-8">
      <p className="ent-heading text-lg text-[var(--ent-ink)] mb-2">Data carriers</p>
      <p className="text-sm text-[var(--ent-muted)] mb-4 leading-relaxed">
        Stable public identity on every tag. QR is live today; NFC and RFID register as draft until encoded.
      </p>

      {error ? <p className="text-sm text-red-700 mb-3">{error}</p> : null}

      {carriers.length === 0 ? (
        <p className="text-sm text-[var(--ent-muted)] mb-4">
          {publishReady
            ? "Provision a QR for hang-tag artwork before you publish."
            : "Complete identity and composition review to provision carriers."}
        </p>
      ) : (
        <ul className="space-y-3 mb-4">
          {carriers.map((carrier) => (
            <li key={carrier.id} className="ent-panel-nested p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-medium text-[var(--ent-ink)]">
                  {CARRIER_LABELS[carrier.carrier_type] || carrier.carrier_type}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${stateTone(carrier.state)}`}
                >
                  {carrier.state}
                </span>
                {carrier.batch_label ? (
                  <span className={`text-[10px] ${entLabelClass}`}>{carrier.batch_label}</span>
                ) : null}
              </div>
              <p className="text-xs text-[var(--ent-muted)] break-all">{carrier.public_url}</p>
              {canMutate && carrier.state !== "retired" ? (
                <button
                  type="button"
                  className={`${entButtonGhostClass} mt-3 text-xs`}
                  disabled={busy === carrier.id}
                  onClick={() => retire(carrier.id)}
                >
                  {busy === carrier.id ? "Retiring…" : "Retire carrier"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canMutate && publishReady ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={entButtonClass}
            disabled={Boolean(busy)}
            onClick={() => provision("qr")}
            data-testid="button-provision-qr"
          >
            {busy === "qr" ? "Provisioning…" : "Provision QR for hang tags"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className={`${entButtonGhostClass} flex-1 text-xs`}
              disabled={Boolean(busy)}
              onClick={() => provision("nfc")}
            >
              Register NFC (draft)
            </button>
            <button
              type="button"
              className={`${entButtonGhostClass} flex-1 text-xs`}
              disabled={Boolean(busy)}
              onClick={() => provision("rfid")}
            >
              Register RFID (draft)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

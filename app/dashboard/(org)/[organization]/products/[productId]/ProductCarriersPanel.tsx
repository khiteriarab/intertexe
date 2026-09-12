"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { entButtonClass } from "@app/dashboard/components/EnterpriseUi";
import { QrCodeActions } from "@app/dashboard/components/QrCodeActions";
import type { CarrierType, DataCarrierRow } from "@/lib/enterprise/carriers";

const CARRIER_OPTIONS: Array<{
  type: CarrierType;
  label: string;
  description: string;
  pilotNote?: string;
}> = [
  {
    type: "qr",
    label: "QR code",
    description: "Hang-tag QR resolves to this product's public INTERTEXE identity.",
    pilotNote: "Selected for Customer Zero pilot",
  },
  {
    type: "nfc",
    label: "NFC",
    description: "Registers identity only — physical NFC encoding not provisioned yet.",
  },
  {
    type: "rfid",
    label: "RFID / advanced carrier",
    description: "Registers identity only — warehouse RFID encoding not provisioned yet.",
  },
];

function carrierForType(carriers: DataCarrierRow[], type: CarrierType): DataCarrierRow | null {
  return (
    carriers.find((row) => row.carrier_type === type && row.state !== "retired") ||
    carriers.find((row) => row.carrier_type === type) ||
    null
  );
}

export function ProductCarriersPanel({
  slug,
  productId,
  canMutate,
  carriers,
  publishReady,
  absoluteUrl,
  publicId,
}: {
  slug: string;
  productId: string;
  canMutate: boolean;
  carriers: DataCarrierRow[];
  publishReady: boolean;
  absoluteUrl?: string | null;
  publicId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<CarrierType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeType = useMemo(() => {
    const live =
      carriers.find((row) => row.state === "active") ||
      carriers.find((row) => row.state === "draft");
    return (live?.carrier_type as CarrierType) || "qr";
  }, [carriers]);

  const [selected, setSelected] = useState<CarrierType>("qr");

  useEffect(() => {
    setSelected(activeType);
  }, [activeType]);

  const selectedCarrier = carrierForType(carriers, selected);
  const qrResolveUrl =
    selected === "qr"
      ? selectedCarrier?.public_url || absoluteUrl || (publicId ? `/p/${publicId}` : null)
      : null;

  async function selectCarrier(type: CarrierType) {
    setSelected(type);
    if (!canMutate || !publishReady) return;
    if (carrierForType(carriers, type)) return;

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

  return (
    <div className="ent-float-card p-6 md:p-8">
      <p className="ent-heading text-lg text-[var(--ent-ink)] mb-1">Data carrier</p>
      <p className="text-sm text-[var(--ent-muted)] mb-5 leading-relaxed">
        Physical product → carrier identifier → INTERTEXE product identity → public passport. One identity,
        multiple carrier types.
      </p>

      {error ? <p className="text-sm text-[var(--ent-raspberry)] mb-3">{error}</p> : null}

      <fieldset className="space-y-2 mb-5">
        <legend className="sr-only">Data carrier type</legend>
        {CARRIER_OPTIONS.map((option) => {
          const provisioned = Boolean(carrierForType(carriers, option.type));
          const isSelected = selected === option.type;
          const disabledOption = option.type !== "qr" && !provisioned;
          return (
            <label
              key={option.type}
              className={`ent-carrier-option ${isSelected ? "ent-carrier-option--selected" : ""} ${
                disabledOption && !isSelected ? "opacity-80" : ""
              }`}
            >
              <input
                type="radio"
                name="data-carrier"
                value={option.type}
                checked={isSelected}
                onChange={() => selectCarrier(option.type)}
                disabled={Boolean(busy) || (!canMutate && option.type !== "qr" && !provisioned)}
                className="ent-carrier-radio"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--ent-ink)]">{option.label}</span>
                  {option.pilotNote && option.type === "qr" ? (
                    <span className="ent-carrier-badge">{option.pilotNote}</span>
                  ) : null}
                  {provisioned ? (
                    <span className="ent-carrier-badge">{carrierForType(carriers, option.type)?.state || "draft"}</span>
                  ) : option.type !== "qr" ? (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--ent-muted-light)]">
                      Not encoded
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs text-[var(--ent-muted)] mt-1 leading-relaxed">{option.description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {!publishReady ? (
        <p className="text-sm text-[var(--ent-muted)] mb-4">
          Complete identity and composition review to provision carriers.
        </p>
      ) : null}

      {selected === "qr" && qrResolveUrl && publicId ? (
        <QrCodeActions url={qrResolveUrl} publicId={publicId} />
      ) : selected !== "qr" && selectedCarrier ? (
        <div className="ent-panel-nested p-4 text-sm">
          <p className="text-[var(--ent-muted)]">
            {CARRIER_OPTIONS.find((o) => o.type === selected)?.label} identity registered — awaiting physical encoding.
          </p>
          <p className="text-xs text-[var(--ent-muted-light)] mt-2 break-all">{selectedCarrier.public_url}</p>
        </div>
      ) : null}

      {canMutate && publishReady && selected === "qr" && !carrierForType(carriers, "qr") ? (
        <button
          type="button"
          className={`${entButtonClass} mt-4 w-full`}
          disabled={Boolean(busy)}
          onClick={() => selectCarrier("qr")}
          data-testid="button-provision-qr"
        >
          {busy === "qr" ? "Generating QR…" : "Generate QR code"}
        </button>
      ) : null}
    </div>
  );
}

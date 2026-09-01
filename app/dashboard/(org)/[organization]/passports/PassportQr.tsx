"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function PassportQr({
  url,
  publicId,
  variant = "default",
}: {
  url: string;
  publicId: string;
  variant?: "default" | "compact" | "collapsible";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "collapsible") {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[13px] font-medium text-[var(--ent-petrol-deep)] hover:text-[var(--ent-forest)] transition-colors"
        >
          {open ? "Hide QR code" : "Show QR code"}
        </button>
        {open ? (
          <div className="mt-4 flex items-start gap-4 p-4 rounded-xl bg-[var(--ent-surface-muted)]/60">
            <div className="bg-white p-1.5 rounded border border-[var(--ent-border)] shrink-0">
              <QRCodeSVG value={url} size={72} marginSize={1} />
            </div>
            <div className="min-w-0 text-xs text-[var(--ent-muted)]">
              <p className="font-mono break-all text-[var(--ent-ink-soft)]">{publicId}</p>
              <p className="mt-1 break-all">{url}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 font-mono text-xs text-[var(--ent-muted-light)] truncate">{publicId}</p>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-white p-1 rounded border border-[var(--ent-border)] shrink-0">
          <QRCodeSVG value={url} size={56} marginSize={1} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-[var(--ent-muted)] break-all">{publicId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <div className="bg-white p-1.5 rounded-lg border border-[var(--ent-border)] shrink-0">
        <QRCodeSVG value={url} size={88} marginSize={1} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.08em] uppercase text-[var(--ent-muted-light)]">Public identity</p>
        <p className="font-mono text-xs break-all text-[var(--ent-ink-soft)] mt-1">{publicId}</p>
        <p className="text-xs text-[var(--ent-muted)] mt-1 break-all">{url}</p>
      </div>
    </div>
  );
}

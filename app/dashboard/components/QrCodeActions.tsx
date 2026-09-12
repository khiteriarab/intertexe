"use client";

import { useCallback, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { entButtonGhostClass, entLinkClass } from "./EnterpriseUi";

export function QrCodeActions({
  url,
  publicId,
  size = 112,
}: {
  url: string;
  publicId: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const downloadQr = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `intertexe-qr-${publicId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [publicId]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);

  return (
    <div>
      <div className="ent-carrier-qr-panel">
        <div className="flex items-start gap-4">
          <div className="ent-journey-qr-frame shrink-0 bg-white p-2">
            <QRCodeCanvas ref={canvasRef} value={url} size={size} marginSize={1} />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-mono text-xs text-[var(--ent-ink-soft)] break-all">{publicId}</p>
            <p className="text-[var(--ent-muted)] mt-2 break-all text-xs">{url}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <a href={`/p/${publicId}`} target="_blank" rel="noopener noreferrer" className={entLinkClass}>
          View passport →
        </a>
        <button type="button" className={entButtonGhostClass} onClick={downloadQr}>
          Download QR
        </button>
        <button type="button" className={entButtonGhostClass} onClick={copyLink}>
          {copied ? "Copied" : "Copy public link"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { QRCodeSVG } from "qrcode.react";

export function PassportQr({
  url,
  publicId,
}: {
  url: string;
  publicId: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-white p-1 border border-black/10">
        <QRCodeSVG value={url} size={88} marginSize={1} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-black/45">Public identity</p>
        <p className="font-mono text-xs break-all">{publicId}</p>
        <p className="text-xs text-black/50 mt-1 break-all">{url}</p>
      </div>
    </div>
  );
}

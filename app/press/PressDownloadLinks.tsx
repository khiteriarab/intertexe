"use client";

import Link from "next/link";

export function PressDownloadLinks() {
  function handlePrintPdf(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const win = window.open("/press-kit", "_blank");
    if (!win) return;
    win.addEventListener("load", () => {
      win.print();
    });
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Link
        href="/press-kit"
        className="inline-block text-xs tracking-widest uppercase border border-gray-900 px-6 py-3 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
        style={{ letterSpacing: "0.15em" }}
        data-testid="link-press-kit-view"
      >
        View Press Kit
      </Link>
      <a
        href="/intertexe-press-kit.pdf"
        className="inline-block text-xs tracking-widest uppercase border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
        style={{ letterSpacing: "0.15em" }}
        data-testid="link-press-kit-pdf"
      >
        Download PDF
      </a>
      <a
        href="/press-kit"
        onClick={handlePrintPdf}
        className="text-xs text-gray-400 underline underline-offset-4"
        data-testid="link-press-kit-print"
      >
        Save as PDF
      </a>
    </div>
  );
}

"use client";

export function PressKitToolbar() {
  return (
    <div className="press-toolbar print:hidden">
      <button type="button" onClick={() => window.print()}>
        Save as PDF
      </button>
      <a href="/intertexe-press-kit.pdf" download>
        Download PDF
      </a>
    </div>
  );
}

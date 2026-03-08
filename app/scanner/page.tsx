import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Intelligence Scanner",
  description: "Paste any product URL and our AI will analyze the fabric composition, quality, and value. Know exactly what you're buying before you buy it.",
  alternates: { canonical: "https://www.intertexe.com/scanner" },
};

export default function ScannerPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center">
      <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mb-4">
        AI-Powered
      </span>
      <h1 className="text-3xl md:text-5xl font-serif mb-4" data-testid="text-scanner-title">
        Shopping Intelligence Scanner
      </h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Paste any product URL and our AI will analyze the fabric composition, quality, and value.
      </p>
      <p className="text-xs text-muted-foreground">
        Scanner functionality coming soon to the new platform.
      </p>
    </div>
  );
}

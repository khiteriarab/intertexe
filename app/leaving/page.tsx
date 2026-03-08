"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Suspense } from "react";

function LeavingContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const brand = searchParams.get("brand") || "this brand";

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center max-w-lg mx-auto">
      <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mb-6">
        Leaving INTERTEXE
      </span>
      <h1 className="text-2xl md:text-4xl font-serif mb-4" data-testid="text-leaving-title">
        You&apos;re heading to {brand}
      </h1>
      <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8">
        You&apos;re about to visit an external website. INTERTEXE may earn a commission from qualifying purchases at no extra cost to you.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3.5 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground/90 transition-colors"
            data-testid="link-continue"
          >
            Continue to {brand} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 border border-border px-6 py-3.5 uppercase tracking-[0.15em] text-xs font-medium hover:bg-secondary transition-colors"
          data-testid="link-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to INTERTEXE
        </Link>
      </div>
    </div>
  );
}

export default function LeavingPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20">Loading...</div>}>
      <LeavingContent />
    </Suspense>
  );
}

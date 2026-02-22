import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { ExternalLink } from "lucide-react";

function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function Leaving() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const rawUrl = params.get("url") || "";
  const brand = params.get("brand") || "our partner";

  const isValid = isValidExternalUrl(rawUrl);
  const url = isValid ? rawUrl : "";

  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!url) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = url;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [url]);

  if (!url) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-6" data-testid="leaving-error">
        <h1 className="text-2xl md:text-3xl font-serif">Invalid link</h1>
        <p className="text-sm text-muted-foreground">The destination provided is not valid.</p>
        <Link href="/designers" className="border border-foreground px-8 py-3 uppercase tracking-widest text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors active:scale-95" data-testid="link-back-directory">
          Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24 flex flex-col items-center gap-10 md:gap-14 max-w-xl mx-auto text-center px-4" data-testid="leaving-page">
      <div className="flex flex-col gap-4">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">You are leaving INTERTEXE</span>
        <h1 className="text-3xl md:text-5xl font-serif leading-tight">
          Redirecting to {brand}
        </h1>
      </div>

      <div className="flex flex-col gap-4 w-full border-y border-border/40 py-8 md:py-10">
        <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-light">
          You are being redirected to <strong className="font-medium">{brand}</strong>'s website to complete your purchase. INTERTEXE curates and filters products by fabric quality — we do not process transactions directly.
        </p>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          All orders, shipping, returns, and customer service are handled by {brand}. Please review their policies before purchasing.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        <a
          href={url}
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full max-w-sm bg-foreground text-background px-8 py-4 uppercase tracking-widest text-[10px] md:text-xs hover:bg-foreground/90 transition-colors active:scale-[0.98]"
          data-testid="link-continue-to-brand"
        >
          Continue to {brand} <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <span className="text-xs text-muted-foreground">
          Redirecting automatically in {countdown} second{countdown !== 1 ? "s" : ""}…
        </span>

        <Link href="/designers" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors border-b border-muted-foreground/40 pb-0.5 active:scale-95" data-testid="link-back-directory">
          Go back to Directory
        </Link>
      </div>

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-xs">
        INTERTEXE may earn a commission on qualifying purchases. This does not affect the price you pay.
      </p>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ShopError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shop]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-20 text-center gap-6">
      <h1 className="text-2xl font-serif">Shop temporarily unavailable</h1>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        We could not load the catalog right now. Your filters are saved — try again or browse without filters.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.assign("/shop");
          }}
          className="px-8 py-3 bg-foreground text-background text-[11px] uppercase tracking-[0.2em]"
        >
          Try again
        </button>
        <Link
          href="/shop"
          className="px-8 py-3 border border-foreground/30 text-[11px] uppercase tracking-[0.2em]"
        >
          View all products
        </Link>
      </div>
    </div>
  );
}

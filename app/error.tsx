"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">INTERTEXE</p>
      <h1 className="font-serif text-3xl md:text-4xl">This page had trouble loading.</h1>
      <p className="text-sm text-neutral-500 max-w-md">
        Refresh or go back to the homepage. Your catalog and platform pages are still available.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="border border-neutral-800 px-6 py-2 text-[10px] uppercase tracking-[0.18em]"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-6 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 underline"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

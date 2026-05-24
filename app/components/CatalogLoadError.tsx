"use client";

export function CatalogLoadError({
  variant = "timeout",
  onRetry,
}: {
  variant?: "timeout" | "failed" | "offset_cap";
  onRetry?: () => void;
}) {
  const copy =
    variant === "offset_cap"
      ? {
          title: "You've reached the end of this browse window.",
          body: "Filter by material or category to narrow results, or start a new search.",
        }
      : variant === "timeout"
        ? {
            title: "Something went wrong loading products.",
            body: "Try filtering by a material above, or refresh the page.",
          }
        : {
            title: "Something went wrong loading products.",
            body: "Try filtering by a material above, or refresh the page.",
          };

  return (
    <div className="py-16 md:py-20 text-center max-w-md mx-auto px-4" data-testid="catalog-load-error">
      <p className="text-[13px] md:text-sm text-foreground/70 leading-relaxed font-light tracking-wide">
        {copy.title}
      </p>
      <p className="text-[11px] md:text-[12px] text-muted-foreground mt-3 leading-relaxed tracking-wide">
        {copy.body}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 text-[10px] uppercase tracking-[0.2em] text-foreground border border-foreground/25 px-8 py-3 hover:bg-[#f5f5f3] transition-colors"
        >
          Refresh
        </button>
      )}
    </div>
  );
}

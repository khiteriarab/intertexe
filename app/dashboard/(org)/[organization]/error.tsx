"use client";

import { useEffect } from "react";

export default function OrganizationWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[enterprise-workspace]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-16 px-6 text-center">
      <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--ent-muted-light)] mb-3">Workspace error</p>
      <h1 className="ent-title text-[1.75rem] text-[var(--ent-ink)] mb-3">This page failed to load</h1>
      <p className="text-sm text-[var(--ent-muted)] leading-relaxed mb-8">
        A client error interrupted navigation. Your session is still active — try again or return to the overview.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button type="button" onClick={() => reset()} className="ent-btn ent-btn-primary px-6 py-2.5 text-sm">
          Try again
        </button>
        <a href="." className="ent-btn ent-btn-secondary px-6 py-2.5 text-sm">
          Reload workspace
        </a>
      </div>
      {error.digest ? (
        <p className="text-[11px] text-[var(--ent-muted-light)] mt-6 font-mono">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}

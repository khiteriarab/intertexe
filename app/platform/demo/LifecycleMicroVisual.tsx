"use client";

import type { LifecycleVisualType } from "./lifecycle-data";

/** Abstract micro-diagram for the editorial detail panel only. */
export function LifecycleMicroVisual({ type }: { type: LifecycleVisualType }) {
  return (
    <svg className="plc-micro" viewBox="0 0 160 56" aria-hidden>
      {type === "converge" ? (
        <>
          <path d="M8 12 H48 M8 28 H48 M8 44 H48" />
          <path d="M48 12 L88 28 M48 28 L88 28 M48 44 L88 28" />
          <rect x="88" y="16" width="56" height="24" rx="1.5" />
          <text x="116" y="32" textAnchor="middle">
            TX
          </text>
        </>
      ) : null}
      {type === "normalize" ? (
        <>
          <path d="M10 14 H70 M14 28 H66 M18 42 H62" strokeDasharray="3 3" />
          <path d="M78 28 H92" />
          <rect x="92" y="14" width="54" height="28" rx="1.5" />
          <path d="M100 24 H138 M100 34 H130" />
        </>
      ) : null}
      {type === "trace" ? (
        <>
          <circle cx="28" cy="16" r="5" />
          <circle cx="28" cy="40" r="5" />
          <circle cx="72" cy="28" r="5" className="is-fill" />
          <circle cx="118" cy="28" r="8" />
          <path d="M33 18 L67 26 M33 38 L67 30 M77 28 H110" />
        </>
      ) : null}
      {type === "checklist" ? (
        <>
          <path d="M24 16 H120 M24 28 H120 M24 40 H100" />
          <path d="M14 16 l3 3 6-7" />
          <path d="M14 28 l3 3 6-7" />
          <circle cx="16" cy="40" r="4" />
        </>
      ) : null}
      {type === "publish" ? (
        <>
          <rect x="12" y="14" width="44" height="28" rx="1.5" />
          <path d="M56 28 H72" />
          <rect x="72" y="10" width="40" height="36" rx="1.5" className="is-accent" />
          <path d="M112 18 H148 M112 28 H148 M112 38 H148" />
        </>
      ) : null}
      {type === "signals" ? (
        <>
          <rect x="58" y="12" width="44" height="32" rx="1.5" />
          <path d="M20 16 L58 24 M20 40 L58 32 M102 24 L140 16 M102 32 L140 40" />
          <circle cx="18" cy="16" r="3" className="is-fill" />
          <circle cx="18" cy="40" r="3" className="is-fill" />
          <circle cx="142" cy="16" r="3" className="is-fill" />
          <circle cx="142" cy="40" r="3" className="is-fill" />
        </>
      ) : null}
      {type === "loop" ? (
        <>
          <circle cx="80" cy="28" r="18" />
          <circle cx="80" cy="28" r="5" className="is-fill" />
          <path d="M80 10 v-4 M98 28 h4 M80 46 v4 M62 28 h-4" />
        </>
      ) : null}
    </svg>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { WorkspaceContext } from "../../../lib/enterprise/types";

const VARIANT = {
  hq: {
    trigger:
      "w-full flex items-center gap-2 text-left rounded-lg border border-black/10 bg-[#fafaf9] px-3 py-2.5 hover:border-black/18 hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15",
    eyebrow: "text-[10px] tracking-[0.14em] uppercase text-black/45",
    value: "text-sm font-semibold text-black truncate",
    chevron: "text-black/35",
    menu: "absolute z-[60] left-0 right-0 mt-1.5 overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.1)]",
    option: "w-full text-left px-3 py-2.5 text-sm text-black/65 hover:bg-black/[0.04] hover:text-black transition-colors",
    optionActive: "bg-black/[0.05] text-black font-medium",
    error: "text-[#9e4a5a]",
  },
  light: {
    trigger:
      "w-full flex items-center gap-2 text-left rounded-lg border border-[rgba(26,31,34,0.1)] bg-white px-3 py-2.5 hover:border-[rgba(62,98,104,0.22)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(62,98,104,0.2)]",
    eyebrow: "text-[10px] tracking-[0.14em] uppercase text-[#9a948c]",
    value: "text-sm font-medium text-[#1a1f22] truncate",
    chevron: "text-[#9a948c]",
    menu: "absolute z-[60] left-0 right-0 mt-1.5 overflow-hidden rounded-lg border border-[rgba(26,31,34,0.1)] bg-white shadow-[0_12px_40px_rgba(62,98,104,0.12)]",
    option: "w-full text-left px-3 py-2.5 text-sm text-[#6b6560] hover:bg-[#f4f2ee] hover:text-[#1a1f22] transition-colors",
    optionActive: "bg-[rgba(66,102,108,0.08)] text-[#3e6268] font-medium",
    error: "text-[#9e4a5a]",
  },
  rail: {
    trigger:
      "w-full flex items-center gap-2 text-left rounded-lg border border-[rgba(26,31,34,0.08)] bg-white px-3 py-2.5 hover:border-[rgba(62,98,104,0.18)] hover:shadow-[0_4px_16px_rgba(26,31,34,0.05)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(62,98,104,0.18)]",
    eyebrow: "text-[10px] tracking-[0.14em] uppercase text-[#9a948c]",
    value: "text-sm font-medium text-[#1a1f22] truncate",
    chevron: "text-[#9a948c]",
    menu: "absolute z-[60] left-0 right-0 mt-1.5 overflow-hidden rounded-lg border border-[rgba(26,31,34,0.1)] bg-white shadow-[0_16px_48px_rgba(62,98,104,0.14)]",
    option: "w-full text-left px-3 py-2.5 text-sm text-[#6b6560] hover:bg-[#f4f2ee] hover:text-[#1a1f22] transition-colors",
    optionActive: "bg-[rgba(66,102,108,0.08)] text-[#3e6268] font-medium",
    error: "text-[#9e4a5a]",
  },
  sidebar: {
    trigger:
      "w-full flex items-center gap-2 text-left rounded-lg border border-white/12 bg-white/10 px-3 py-2.5 text-white hover:bg-white/14 transition-colors",
    eyebrow: "text-[10px] tracking-[0.14em] uppercase text-white/45",
    value: "text-sm font-medium text-white/95 truncate",
    chevron: "text-white/45",
    menu: "absolute z-[60] left-0 right-0 mt-1.5 overflow-hidden rounded-lg border border-white/12 bg-[#345860] shadow-[0_12px_40px_rgba(0,0,0,0.2)]",
    option: "w-full text-left px-3 py-2.5 text-sm text-white/75 hover:bg-white/8 hover:text-white transition-colors",
    optionActive: "bg-white/12 text-white font-medium",
    error: "text-[#f5c6cb]",
  },
} as const;

export function WorkspaceSwitcher({
  contexts,
  currentHref,
  variant = "light",
  organizationName,
}: {
  contexts: WorkspaceContext[];
  currentHref: string;
  variant?: keyof typeof VARIANT;
  organizationName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const styles = VARIANT[variant];

  const current =
    contexts.find((item) => item.href === currentHref) ||
    contexts.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function onSelect(href: string) {
    setOpen(false);
    setError(null);
    const next = contexts.find((item) => item.href === href);
    if (next?.type === "org") {
      setPending(true);
      try {
        const res = await fetch("/api/dashboard/workspace/enter-enterprise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: next.slug, redirectTo: pathname }),
        });
        const data = (await res.json().catch(() => ({}))) as { message?: string; redirectTo?: string };
        if (!res.ok) {
          setError(typeof data.message === "string" ? data.message : "Could not open that workspace.");
          return;
        }
        router.push(typeof data.redirectTo === "string" ? data.redirectTo : href);
        router.refresh();
      } finally {
        setPending(false);
      }
      return;
    }
    router.push(href);
    router.refresh();
  }

  const label = current?.label || organizationName || "Workspace";

  if (contexts.length < 2) {
    if ((variant !== "rail" && variant !== "sidebar") || !organizationName) return null;
    return (
      <div className="mt-1">
        <p className={styles.eyebrow}>Workspace</p>
        <p className={`${styles.value} mt-1`}>{organizationName}</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative mt-4">
      <button
        type="button"
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={styles.trigger}
      >
        <span className="min-w-0 flex-1">
          <span className={`block ${styles.eyebrow}`}>Workspace</span>
          <span className={`block ${styles.value} mt-0.5`}>{label}</span>
        </span>
        <svg
          className={`shrink-0 transition-transform duration-200 ${styles.chevron} ${open ? "rotate-180" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
        >
          <path fill="currentColor" d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      {open ? (
        <ul id={listId} role="listbox" className={styles.menu}>
          {contexts.map((item) => {
            const active = item.href === current?.href;
            return (
              <li key={item.href} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onSelect(item.href)}
                  className={`${styles.option} ${active ? styles.optionActive : ""}`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? <p className={`mt-2 text-[11px] ${styles.error}`}>{error}</p> : null}
    </div>
  );
}

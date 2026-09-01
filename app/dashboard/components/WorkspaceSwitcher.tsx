"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceContext } from "../../../lib/enterprise/types";

export function WorkspaceSwitcher({
  contexts,
  currentHref,
  variant = "light",
}: {
  contexts: WorkspaceContext[];
  currentHref: string;
  variant?: "light" | "sidebar";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  if (contexts.length < 2) return null;

  const current =
    contexts.find((item) => item.href === currentHref) ||
    contexts.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function onSelect(href: string) {
    setOpen(false);
    setError(null);
    const next = contexts.find((item) => item.href === href);
    if (next?.type === "org") {
      setPending(true);
      const res = await fetch("/api/dashboard/workspace/enter-enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: next.slug }),
      });
      const data = await res.json().catch(() => ({}));
      setPending(false);
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Could not open that workspace.");
        return;
      }
    }
    router.push(href);
    router.refresh();
  }

  const isSidebar = variant === "sidebar";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className={`w-full text-left rounded-[var(--ent-radius-lg)] transition-colors ${
          isSidebar
            ? "bg-white/10 hover:bg-white/14 border border-white/12 px-4 py-3.5 text-white"
            : "bg-[var(--ent-surface)] border border-[var(--ent-border-strong)] px-4 py-3 text-[var(--ent-ink)] shadow-[var(--ent-shadow-sm)]"
        }`}
      >
        <p className={`text-[10px] tracking-[0.12em] uppercase ${isSidebar ? "text-white/45" : "text-[var(--ent-muted-light)]"}`}>
          Workspace
        </p>
        <p className={`text-sm font-medium mt-1 truncate ${isSidebar ? "text-white/95" : "text-[var(--ent-ink)]"}`}>
          {current?.label || "Select workspace"}
        </p>
      </button>

      {open ? (
        <ul
          className={`absolute z-50 left-0 right-0 mt-2 overflow-hidden rounded-[var(--ent-radius-lg)] shadow-[var(--ent-shadow-lg)] ${
            isSidebar ? "bg-[#345860] border border-white/12" : "bg-[var(--ent-surface)] border border-[var(--ent-border-strong)]"
          }`}
        >
          {contexts.map((item) => {
            const active = item.href === current?.href;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onSelect(item.href)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    isSidebar
                      ? active
                        ? "bg-white/12 text-white"
                        : "text-white/75 hover:bg-white/8 hover:text-white"
                      : active
                        ? "bg-[var(--ent-surface-muted)] text-[var(--ent-ink)]"
                        : "text-[var(--ent-muted)] hover:bg-[var(--ent-surface-muted)]/70"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? <p className={`mt-2 text-[11px] ${isSidebar ? "text-[#f5c6cb]" : "text-[var(--ent-raspberry)]"}`}>{error}</p> : null}
    </div>
  );
}

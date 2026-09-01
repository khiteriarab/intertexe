"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceContext } from "../../../lib/enterprise/types";

export function WorkspaceSwitcher({
  contexts,
  currentHref,
  variant = "light",
  organizationName,
}: {
  contexts: WorkspaceContext[];
  currentHref: string;
  variant?: "light" | "sidebar" | "rail";
  organizationName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const isRail = variant === "rail";
  const isSidebar = variant === "sidebar";
  const label = current?.label || organizationName || "Workspace";

  if (contexts.length < 2) {
    if (!isRail || !organizationName) return null;
    return (
      <div className="ent-workspace-static">
        <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)]">Workspace</p>
        <p className="text-sm font-medium mt-1 truncate text-[var(--ent-ink)]">{organizationName}</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className={`ent-workspace-trigger ${isRail ? "ent-workspace-trigger-rail" : isSidebar ? "ent-workspace-trigger-sidebar" : "ent-workspace-trigger-light"}`}
      >
        <span className="min-w-0 flex-1">
          <span className={`block text-[10px] tracking-[0.14em] uppercase ${isRail || isSidebar ? "text-[var(--ent-muted-light)]" : "text-[var(--ent-muted-light)]"}`}>
            Workspace
          </span>
          <span className={`block text-sm font-medium mt-1 truncate ${isRail ? "text-[var(--ent-ink)]" : isSidebar ? "text-white/95" : "text-[var(--ent-ink)]"}`}>
            {label}
          </span>
        </span>
        <svg className="shrink-0 ml-2 opacity-50" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path fill="currentColor" d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      {open ? (
        <ul
          className={`ent-workspace-menu ${isRail ? "ent-workspace-menu-rail" : isSidebar ? "ent-workspace-menu-sidebar" : "ent-workspace-menu-light"}`}
        >
          {contexts.map((item) => {
            const active = item.href === current?.href;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onSelect(item.href)}
                  className={`ent-workspace-option ${active ? "ent-workspace-option-active" : ""}`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? <p className="mt-2 text-[11px] text-[var(--ent-raspberry)]">{error}</p> : null}
    </div>
  );
}

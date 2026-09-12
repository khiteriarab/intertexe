"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { HQ_NAV, HQ_NAV_SECONDARY } from "../../../lib/dashboard/constants";
import type { WorkspaceContext } from "../../../lib/enterprise/types";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import "../hq-theme.css";

type Props = {
  children: React.ReactNode;
  email: string;
  fullName: string | null;
  roles: string[];
  workspaceName: string;
  workspaceContexts?: WorkspaceContext[];
};

export function HqShell({
  children,
  email,
  fullName,
  roles,
  workspaceName,
  workspaceContexts = [],
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="hq-app min-h-screen">
      <div className="md:hidden border-b border-[var(--hq-border)] bg-[var(--hq-surface)]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div>
          <p className="hq-eyebrow">INTERTEXE Dashboard</p>
          <p className="text-sm font-medium">{workspaceName}</p>
          <WorkspaceSwitcher contexts={workspaceContexts} currentHref="/dashboard" variant="hq" />
        </div>
        <button
          type="button"
          className="text-xs tracking-widest uppercase border border-[var(--hq-border)] px-3 py-2 rounded-md text-[var(--hq-muted)]"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[240px_1fr] min-h-screen">
        <aside
          className={`hq-sidebar ${
            mobileOpen ? "block" : "hidden"
          } md:block border-r`}
        >
          <div className="px-5 py-6 border-b border-[var(--hq-border)] hidden md:block">
            <p className="hq-eyebrow">Dashboard</p>
            <p className="hq-display text-[1.35rem] mt-1">INTERTEXE</p>
            <p className="text-xs text-[var(--hq-muted)] mt-1">Company operating system</p>
            <WorkspaceSwitcher contexts={workspaceContexts} currentHref="/dashboard" variant="hq" />
          </div>
          <nav className="px-3 py-4 space-y-0.5">
            {HQ_NAV.filter((item) => !("founderOnly" in item && item.founderOnly) || roles.includes("founder")).map((item) => {
              const exact = "exact" in item && item.exact;
              const active = exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`hq-nav-link block px-3 py-2 text-sm rounded-md ${
                    active ? "hq-nav-link-active" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <nav className="px-3 py-2 space-y-0.5 border-t border-[var(--hq-border)] mt-2">
            <p className="px-3 pt-3 pb-1 text-[10px] tracking-[0.14em] uppercase text-[var(--hq-quiet)]">
              Operations
            </p>
            {HQ_NAV_SECONDARY.filter(
              (item) => !("founderOnly" in item && item.founderOnly) || roles.includes("founder")
            ).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`hq-nav-link block px-3 py-2 text-sm rounded-md ${
                    active ? "hq-nav-link-active" : "text-[var(--hq-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-5 py-5 border-t border-[var(--hq-border)] mt-2">
            <p className="text-sm font-medium truncate">{fullName || "Founder"}</p>
            <p className="text-xs text-[var(--hq-muted)] truncate">{email}</p>
            <p className="text-[10px] tracking-wide uppercase text-[var(--hq-quiet)] mt-2">
              {roles.join(" · ")}
            </p>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 text-xs tracking-widest uppercase text-[var(--hq-muted)] hover:text-[var(--hq-ink)]"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { enterpriseNavForActor } from "../../../lib/enterprise/constants";
import type { WorkspaceContext } from "../../../lib/enterprise/types";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type Props = {
  children: React.ReactNode;
  email: string;
  fullName: string | null;
  organizationName: string;
  organizationSlug: string;
  role: string;
  plan: string;
  workspaceContexts: WorkspaceContext[];
  founderHq?: boolean;
};

export function EnterpriseShell({
  children,
  email,
  fullName,
  organizationName,
  organizationSlug,
  role,
  plan,
  workspaceContexts,
  founderHq = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const base = `/dashboard/${organizationSlug}`;
  const displayName = fullName || email.split("@")[0];

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="enterprise-app min-h-screen">
      <div
        className="md:hidden px-4 py-3.5 flex items-center justify-between text-white"
        style={{ background: "var(--ent-gradient-sidebar)" }}
      >
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50">INTERTEXE</p>
          <p className="text-sm font-medium mt-1 truncate max-w-[12rem]">{organizationName}</p>
        </div>
        <button
          type="button"
          className="text-[11px] tracking-[0.1em] uppercase border border-white/20 rounded-xl px-3 py-2 text-white/90 hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[280px_1fr] min-h-screen md:gap-4 md:p-4 md:pr-5">
        <aside
          className={`${mobileOpen ? "block" : "hidden"} md:flex md:flex-col text-white min-h-full relative rounded-[var(--ent-radius-3xl)] overflow-hidden shadow-[var(--ent-shadow-lg)]`}
          style={{ background: "var(--ent-gradient-sidebar)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 0% 0%, rgba(255,255,255,0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(44,74,62,0.25) 0%, transparent 50%)",
            }}
            aria-hidden
          />

          <div className="relative px-6 py-8 hidden md:block">
            <p className="text-[10px] tracking-[0.22em] uppercase text-white/45">INTERTEXE</p>
            <p className="text-[15px] font-medium mt-5 text-white/95 leading-snug">{organizationName}</p>
            <div className="mt-6">
              <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} variant="sidebar" />
            </div>
          </div>

          <div className="relative px-5 pt-5 md:hidden border-b border-white/10 pb-5">
            <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} variant="sidebar" />
          </div>

          <nav className="relative px-4 py-3 md:py-2 flex-1 space-y-1" aria-label="Organization">
            {enterpriseNavForActor(founderHq).map((item) => {
              const href = `${base}${item.href}`;
              const active =
                "exact" in item && item.exact
                  ? pathname === href || pathname === base
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center px-4 py-3 text-[14px] rounded-[var(--ent-radius-lg)] transition-all duration-200 ${
                    active
                      ? "bg-white/14 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-white/60 hover:bg-white/8 hover:text-white/92"
                  }`}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-white/70" aria-hidden />
                  ) : null}
                  <span className={active ? "pl-2" : ""}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative px-5 py-6 mt-auto">
            <div className="rounded-[var(--ent-radius-xl)] bg-white/8 backdrop-blur-sm border border-white/10 px-4 py-4 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-medium text-white/90"
                style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))" }}
                aria-hidden
              >
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-white/95">{displayName}</p>
                <p className="text-[11px] text-white/40 truncate mt-0.5">{role.replaceAll("_", " ")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 text-[11px] tracking-[0.1em] uppercase text-white/35 hover:text-white/75 transition-colors px-1"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 ent-canvas">
          <div className="ent-canvas-inner px-5 md:px-10 lg:px-14 py-10 md:py-12 max-w-[92rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

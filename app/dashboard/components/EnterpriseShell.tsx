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

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="enterprise-app min-h-screen">
      <div className="md:hidden border-b border-white/10 bg-[var(--ent-petrol-deep)] px-4 py-3.5 flex items-center justify-between text-white">
        <div>
          <p className="ent-serif text-base tracking-[0.06em]">INTERTEXE</p>
          <p className="text-xs text-white/55 mt-0.5 truncate max-w-[12rem]">{organizationName}</p>
        </div>
        <button
          type="button"
          className="text-[11px] tracking-[0.1em] uppercase border border-white/20 rounded-lg px-3 py-2 text-white/90 hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[260px_1fr] min-h-screen">
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } md:flex md:flex-col bg-[var(--ent-petrol-deep)] text-white min-h-full`}
          style={{ background: "linear-gradient(180deg, #3e6268 0%, #345860 100%)" }}
        >
          <div className="px-7 py-9 hidden md:block">
            <p className="ent-serif text-[1.35rem] tracking-[0.06em]">INTERTEXE</p>
            <p className="text-sm font-medium mt-6 text-white/90 leading-snug">{organizationName}</p>
            <div className="mt-5 [&_button]:text-white/75 [&_select]:bg-white/8 [&_select]:border-white/15 [&_select]:text-white [&_select]:rounded-lg">
              <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} />
            </div>
          </div>

          <div className="px-5 pt-5 md:hidden border-b border-white/10 pb-5">
            <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} />
          </div>

          <nav className="px-4 py-4 md:py-2 flex-1 space-y-0.5" aria-label="Organization">
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
                  className={`flex items-center gap-3 px-4 py-3 text-[14px] rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-white/12 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-white/65 hover:bg-white/6 hover:text-white/90"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-6 py-7 mt-auto border-t border-white/10">
            <div className="rounded-xl bg-white/6 px-4 py-4">
              <p className="text-sm font-medium truncate text-white/95">{fullName || email.split("@")[0]}</p>
              <p className="text-xs text-white/45 truncate mt-0.5">{email}</p>
              <p className="text-[10px] tracking-[0.08em] uppercase text-white/30 mt-3">
                {role.replaceAll("_", " ")} · {plan.replaceAll("_", " ")}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 text-[11px] tracking-[0.1em] uppercase text-white/40 hover:text-white/80 transition-colors px-1"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 bg-[var(--ent-ivory)]">
          <div className="px-5 md:px-12 py-10 md:py-14 max-w-[88rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

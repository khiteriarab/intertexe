"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enterpriseNavForActor } from "../../../lib/enterprise/constants";
import type { WorkspaceContext } from "../../../lib/enterprise/types";
import { EnterpriseNav } from "./EnterpriseNav";
import { EntIconSettings } from "./EnterpriseNavIcons";
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
  workspaceContexts,
  founderHq = false,
}: Props) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const base = `/dashboard/${organizationSlug}`;
  const displayName = fullName || email.split("@")[0];
  void enterpriseNavForActor(founderHq);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="enterprise-app min-h-screen">
      <div className="md:hidden ent-mobile-bar px-4 py-3.5 flex items-center justify-between">
        <div>
          <p className="ent-brand">INTERTEXE</p>
          <p className="text-sm font-medium mt-1 truncate max-w-[12rem] text-[var(--ent-ink)]">{organizationName}</p>
        </div>
        <button type="button" className="ent-mobile-menu-btn" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[260px_1fr] min-h-screen">
        <aside className={`ent-nav-rail ${mobileOpen ? "block" : "hidden"} md:flex md:flex-col`}>
          <div className="px-5 pt-7 pb-4 hidden md:block">
            <Link href={base} className="block group">
              <p className="ent-brand-rail group-hover:text-white transition-colors">INTERTEXE</p>
            </Link>
          </div>

          <div className="px-4 pb-3">
            <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} variant="sidebar" organizationName={organizationName} />
          </div>

          <EnterpriseNav base={base} onNavigate={() => setMobileOpen(false)} />

          <div className="px-4 py-5 mt-auto border-t border-white/10">
            <div className="flex items-center gap-3 px-2">
              <div className="ent-nav-avatar ent-nav-avatar-rail" aria-hidden>
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-white/95">{displayName}</p>
                <p className="text-[11px] text-white/45 truncate mt-0.5 capitalize">{role.replaceAll("_", " ")}</p>
              </div>
            </div>
            <button type="button" onClick={logout} disabled={loggingOut} className="ent-nav-signout ent-nav-signout-rail">
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 ent-canvas">
          <header className="ent-topbar hidden md:flex items-center gap-4 px-10 lg:px-14 xl:px-16 pt-6">
            <div className="ent-topbar-search flex-1">
              <span className="ent-topbar-search-icon" aria-hidden>
                ⌕
              </span>
              <input type="search" placeholder="Search products, issues, passports…" className="ent-topbar-search-input" />
            </div>
            <Link href={`${base}/settings`} className="ent-topbar-icon-btn" aria-label="Workspace settings">
              <EntIconSettings className="h-[18px] w-[18px]" />
            </Link>
          </header>
          <div className="ent-canvas-inner px-5 md:px-10 lg:px-14 xl:px-16 py-8 md:py-10 max-w-[84rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

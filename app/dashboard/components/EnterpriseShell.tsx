"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enterpriseNavForActor } from "../../../lib/enterprise/constants";
import type { WorkspaceContext } from "../../../lib/enterprise/types";
import { EnterpriseNav } from "./EnterpriseNav";
import { EntIconSettings } from "./EnterpriseNavIcons";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { CONSUMER_PROOF_LINKS } from "../../../lib/enterprise/dual-model";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";

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
              <p className="ent-brand-rail group-hover:text-[var(--ent-charcoal)] transition-colors">INTERTEXE</p>
            </Link>
          </div>

          <div className="px-4 pb-3">
            <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} variant="sidebar" organizationName={organizationName} />
          </div>

          <EnterpriseNav base={base} onNavigate={() => setMobileOpen(false)} />

          <div className="px-4 py-4 border-t border-[var(--ent-border-strong)]">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--ent-sidebar-fg-soft)] px-2 mb-2">Consumer proof</p>
            <ul className="space-y-1">
              {CONSUMER_PROOF_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-2 py-1.5 text-xs text-[var(--ent-sidebar-fg-muted)] hover:text-[var(--ent-sidebar-fg)] transition-colors rounded-md hover:bg-[rgba(232,220,200,0.35)]"
                    title={link.description}
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 py-5 mt-auto border-t border-[var(--ent-border-strong)]">
            <div className="flex items-center gap-3 px-2">
              <div className="ent-nav-avatar ent-nav-avatar-rail" aria-hidden>
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-[var(--ent-sidebar-fg)]">{displayName}</p>
                <p className="text-[11px] text-[var(--ent-sidebar-fg-soft)] truncate mt-0.5 capitalize">{role.replaceAll("_", " ")}</p>
              </div>
            </div>
            <button type="button" onClick={logout} disabled={loggingOut} className="ent-nav-signout ent-nav-signout-rail">
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 ent-canvas">
          <header className="ent-topbar hidden md:flex items-center gap-3 px-10 lg:px-14 xl:px-16 pt-6 pb-4">
            <GlobalSearch organization={organizationSlug} />
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <NotificationBell organization={organizationSlug} />
              <Link href={`${base}/settings`} className="ent-topbar-icon-btn" aria-label="Workspace settings">
                <EntIconSettings className="h-[18px] w-[18px]" />
              </Link>
            </div>
          </header>
          <div className="ent-canvas-inner px-5 md:px-10 lg:px-14 xl:px-16 py-8 md:py-10 max-w-[84rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ENTERPRISE_NAV_GROUPS, enterpriseNavForActor } from "../../../lib/enterprise/constants";
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

function navItemActive(pathname: string, base: string, href: string, exact?: boolean) {
  const target = `${base}${href}`;
  return exact ? pathname === target || pathname === base : pathname === target || pathname.startsWith(`${target}/`);
}

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
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const base = `/dashboard/${organizationSlug}`;
  const displayName = fullName || email.split("@")[0];
  const navGroups = ENTERPRISE_NAV_GROUPS;
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

      <div className="md:grid md:grid-cols-[232px_1fr] min-h-screen">
        <aside className={`ent-nav-rail ${mobileOpen ? "block" : "hidden"} md:flex md:flex-col`}>
          <div className="px-5 pt-7 pb-5 hidden md:block">
            <Link href={base} className="block group">
              <p className="ent-brand group-hover:text-[var(--ent-forest)] transition-colors">INTERTEXE</p>
            </Link>
          </div>

          <div className="px-4 pb-4 md:pb-5 border-b border-[var(--ent-border)] md:border-none">
            <WorkspaceSwitcher contexts={workspaceContexts} currentHref={base} variant="rail" organizationName={organizationName} />
          </div>

          <nav className="flex-1 px-3 py-4 md:py-2 overflow-y-auto" aria-label="Organization">
            {navGroups.map((group, groupIndex) => (
              <div key={group.id} className={groupIndex > 0 ? "mt-6" : ""}>
                <p className="px-3 mb-2 text-[10px] tracking-[0.16em] uppercase text-[var(--ent-muted-light)]">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = `${base}${item.href}`;
                    const active = navItemActive(pathname, base, item.href, "exact" in item && item.exact);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`ent-nav-link ${active ? "ent-nav-link-active" : ""}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="px-4 py-5 mt-auto border-t border-[var(--ent-border)]">
            <div className="flex items-center gap-3 px-2">
              <div className="ent-nav-avatar" aria-hidden>
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-[var(--ent-ink)]">{displayName}</p>
                <p className="text-[11px] text-[var(--ent-muted-light)] truncate mt-0.5">{role.replaceAll("_", " ")}</p>
              </div>
            </div>
            <button type="button" onClick={logout} disabled={loggingOut} className="ent-nav-signout">
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 ent-canvas">
          <div className="ent-canvas-inner px-5 md:px-10 lg:px-14 xl:px-16 py-8 md:py-10 max-w-[84rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

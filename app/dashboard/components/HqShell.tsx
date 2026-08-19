"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { HQ_NAV } from "../../../lib/dashboard/constants";

type Props = {
  children: React.ReactNode;
  email: string;
  fullName: string | null;
  roles: string[];
  workspaceName: string;
};

export function HqShell({ children, email, fullName, roles, workspaceName }: Props) {
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
    <div className="min-h-screen bg-[#f6f5f3] text-[#1a1a1a]">
      <div className="md:hidden border-b border-black/10 bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">INTERTEXE Dashboard</p>
          <p className="text-sm font-medium">{workspaceName}</p>
        </div>
        <button
          type="button"
          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[220px_1fr] min-h-screen">
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } md:block border-r border-black/10 bg-white`}
        >
          <div className="px-5 py-6 border-b border-black/10 hidden md:block">
            <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">INTERTEXE Dashboard</p>
            <p className="text-lg font-medium mt-1">{workspaceName}</p>
            <p className="text-xs text-black/50 mt-1">Private operating system</p>
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
                  className={`block px-3 py-2 text-sm rounded-md ${
                    active ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-5 py-5 border-t border-black/10 mt-4">
            <p className="text-sm font-medium truncate">{fullName || "Founder"}</p>
            <p className="text-xs text-black/50 truncate">{email}</p>
            <p className="text-[10px] tracking-wide uppercase text-black/40 mt-2">
              {roles.join(" · ")}
            </p>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 text-xs tracking-widest uppercase text-black/60 hover:text-black"
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

export type PlatformNavKey = "demo" | "docs" | "request" | "platform" | "login" | "discover";

const NAV = [
  { href: "/platform/discover", label: "Discover" },
  { href: "/platform/demo", label: "Demo" },
  { href: "/platform/docs", label: "Documentation" },
];

function Arrow() {
  return (
    <span aria-hidden="true" className="text-[14px] leading-none">
      →
    </span>
  );
}

export function PlatformNav({
  active,
  tone = "light",
}: {
  active?: PlatformNavKey;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const signInUrl = getEnterpriseLoginUrl();
  const dark = tone === "dark";

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkTone = (href: string) => {
    const isActive =
      (active === "discover" && href === "/platform/discover") ||
      (active === "demo" && href === "/platform/demo") ||
      (active === "docs" && href === "/platform/docs");
    if (dark) return isActive ? "text-white" : "text-white/70 hover:text-white";
    return isActive ? "text-black" : "text-[#6f6a63] hover:text-black";
  };

  return (
    <nav
      className={
        dark
          ? "border-b border-white/10 bg-[#152238] text-[#f7f5f1]"
          : "border-b border-[#e8e3da]/70 bg-[#faf9f7]/95 backdrop-blur-sm sticky top-0 z-50"
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-8 min-w-0 flex-1 md:justify-center md:relative">
          <Link
            href="/platform"
            className={`text-[13px] sm:text-sm tracking-[0.12em] font-light shrink-0 md:absolute md:left-0 italic ${
              dark ? "text-white" : "text-[#161513]"
            }`}
            style={{ fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif" }}
          >
            intertexe
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] tracking-[0.12em] whitespace-nowrap transition-colors ${linkTone(item.href)}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <Link
            href={signInUrl}
            className={
              dark
                ? "inline-flex items-center gap-2 rounded-full border border-white px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-white min-h-[40px] hover:bg-white/10"
                : "hidden sm:inline-flex items-center gap-2 text-[12px] sm:text-[13px] text-[#6f6a63] min-h-[40px] hover:text-[#161513] transition-colors"
            }
          >
            Sign in
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=nav"
            className={
              dark
                ? "inline-flex items-center gap-2 rounded-full bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-[#152238] min-h-[40px] hover:bg-[#f7f5f1]"
                : "inline-flex items-center gap-2 rounded-full bg-[#152238] px-4 sm:px-5 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-white min-h-[40px] hover:bg-[#0f1a2c] transition-colors"
            }
          >
            Request a demo
            <Arrow />
          </Link>
          <button
            type="button"
            className={`md:hidden text-[10px] tracking-[0.12em] uppercase min-h-[40px] px-1 ${
              dark ? "text-white/70" : "text-[#6f6a63]"
            }`}
            aria-expanded={open}
            aria-controls="platform-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <div
          id="platform-mobile-menu"
          className={`md:hidden border-t px-4 pb-4 pt-2 ${
            dark ? "border-white/10 bg-[#152238]" : "border-[#e8e3da] bg-[#f7f5f1]"
          }`}
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block py-3 text-[13px] tracking-[0.14em] uppercase ${linkTone(item.href)}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

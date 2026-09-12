"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlatformWordmark } from "./PlatformWordmark";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

export type PlatformNavKey = "demo" | "docs" | "request" | "platform" | "login" | "discover";

const NAV = [
  { href: "/platform/discover", label: "Discover" },
  { href: "/platform/demo", label: "Demo" },
  { href: "/platform/docs", label: "API" },
] as const;

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
    return isActive ? "text-[var(--platform-ink)]" : "text-[var(--platform-muted)] hover:text-[var(--platform-ink)]";
  };

  return (
    <nav
      className={
        dark
          ? "border-b border-[var(--platform-border)] bg-[var(--platform-accent-soft)] text-[var(--platform-primary)]"
          : "border-b border-[var(--platform-border)]/80 bg-[var(--platform-bg)]/95 backdrop-blur-md sticky top-0 z-50"
      }
    >
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 lg:py-5 flex items-center justify-between gap-4">
        <PlatformWordmark
          size="sm"
          className={dark ? "text-white" : "text-[var(--platform-ink)]"}
        />

        <div className="hidden md:flex items-center justify-center gap-10 lg:gap-14 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[11px] tracking-[0.14em] uppercase whitespace-nowrap transition-colors ${linkTone(item.href)}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <Link
            href={signInUrl}
            className={
              dark
                ? "hidden sm:inline-flex items-center gap-2 rounded-full border border-white/80 px-4 py-2.5 text-[12px] font-medium text-white min-h-[40px] hover:bg-white/10"
                : "hidden sm:inline-flex items-center text-[12px] text-[var(--platform-muted)] min-h-[40px] px-2 hover:text-[var(--platform-ink)] transition-colors"
            }
          >
            Sign in
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=nav"
            className={
              dark
                ? "inline-flex items-center gap-2 rounded-full bg-[var(--platform-surface)] px-4 py-2.5 text-[12px] font-medium text-[var(--platform-primary)] min-h-[40px] hover:bg-[var(--platform-highlight)] border border-[var(--platform-border)]"
                : "inline-flex items-center gap-2 rounded-full bg-[var(--platform-accent-soft)] px-4 sm:px-5 py-2.5 text-[12px] font-medium text-[var(--platform-primary)] min-h-[40px] hover:bg-[var(--platform-accent-muted)] transition-colors border border-[var(--platform-border)]"
            }
          >
            Request a demo
            <Arrow />
          </Link>
          <button
            type="button"
            className={`md:hidden text-[10px] tracking-[0.12em] uppercase min-h-[40px] px-2 ${
              dark ? "text-white/70" : "text-[var(--platform-muted)]"
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
            dark ? "border-[var(--platform-border)] bg-[var(--platform-accent-soft)]" : "border-[var(--platform-border)] bg-[var(--platform-bg)]"
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
          <Link
            href={signInUrl}
            onClick={() => setOpen(false)}
            className={`block py-3 text-[13px] tracking-[0.14em] uppercase ${dark ? "text-white/70" : "text-[var(--platform-muted)]"}`}
          >
            Sign in
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlatformWordmark } from "./PlatformWordmark";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

export type PlatformNavKey = "demo" | "solutions" | "request" | "platform" | "login";

const NAV = [
  { href: "/platform/solutions", label: "Solutions" },
  { href: "/platform/pricing", label: "Pricing" },
  { href: "/platform/demo", label: "See it live" },
] as const;

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
      (active === "solutions" && href === "/platform/solutions") ||
      (active === "request" && href === "/platform/pricing") ||
      (active === "demo" && href === "/platform/demo");
    return `platform-lux-nav-link ${isActive ? "is-active" : ""}`;
  };

  return (
    <nav className={dark ? "platform-lux-nav" : "platform-lux-nav"} aria-label="Platform">
      <div className="platform-lux-nav-inner">
        <PlatformWordmark size="sm" className="text-[var(--platform-ink)]" />

        <div className="platform-lux-nav-center">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkTone(item.href)}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="platform-lux-nav-actions">
          <Link href={signInUrl} className="platform-lux-nav-signin hidden sm:inline-flex">
            Sign in
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=nav"
            className="platform-lux-nav-cta hidden md:inline-flex"
          >
            Request a demo
            <span aria-hidden>→</span>
          </Link>
          <button
            type="button"
            className="platform-lux-nav-menu"
            aria-expanded={open}
            aria-controls="platform-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <div id="platform-mobile-menu" className="platform-lux-nav-drawer">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={linkTone(item.href)}>
              {item.label}
            </Link>
          ))}
          <Link href={signInUrl} onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href="/platform/request?intent=snapshot&cta=nav" onClick={() => setOpen(false)}>
            Request a demo
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

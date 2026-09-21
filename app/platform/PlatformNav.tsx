"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlatformWordmark } from "./PlatformWordmark";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import { marketingPath } from "../../lib/enterprise-marketing/paths";

export type PlatformNavKey = "demo" | "solutions" | "request" | "success-stories" | "platform" | "login" | "dpp";

const NAV = [
  { href: marketingPath("solutions"), label: "Solutions", key: "solutions" as const },
  { href: "/digital-product-passport", label: "Digital Product Passport", key: "dpp" as const },
  { href: marketingPath("pricing"), label: "Pricing", key: "request" as const },
  { href: marketingPath("demo"), label: "See it live", key: "demo" as const },
  { href: marketingPath("success-stories"), label: "Success Stories", key: "success-stories" as const },
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkTone = (key: (typeof NAV)[number]["key"]) => {
    const isActive =
      (active === "solutions" && key === "solutions") ||
      (active === "dpp" && key === "dpp") ||
      (active === "request" && key === "request") ||
      (active === "demo" && key === "demo") ||
      (active === "success-stories" && key === "success-stories");
    return `platform-lux-nav-link ${isActive ? "is-active" : ""}`;
  };

  return (
    <nav className="platform-lux-nav" aria-label="For brands">
      <div className="platform-lux-nav-inner">
        <PlatformWordmark size="sm" className="text-[var(--platform-ink)]" />

        <div className="platform-lux-nav-center">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkTone(item.key)}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="platform-lux-nav-actions">
          <Link href={signInUrl} className="platform-lux-nav-signin hidden sm:inline-flex">
            Sign in
          </Link>
          <Link
            href={marketingPath("request?intent=snapshot&cta=nav")}
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
            <Link
              key={item.href}
              href={item.href}
              className={linkTone(item.key)}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href={signInUrl} className="platform-lux-nav-signin" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link
            href={marketingPath("request?intent=snapshot&cta=nav")}
            className="platform-lux-nav-cta"
            onClick={() => setOpen(false)}
          >
            Request a demo
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

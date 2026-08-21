"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
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
  active?: "demo" | "docs" | "request" | "platform" | "login";
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
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
      (active === "demo" && href === "/platform/demo") || (active === "docs" && href === "/platform/docs");
    if (dark) return isActive ? "text-white" : "text-white/70 hover:text-white";
    return isActive ? "text-black" : "text-[#6f6a63] hover:text-black";
  };

  return (
    <nav className={dark ? "border-b border-white/10 bg-[#152238] text-[#f7f5f1]" : "border-b border-[#e8e3da]"}>
      <div className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-8 min-w-0">
          <Link
            href="/platform"
            className={`text-[12px] sm:text-sm tracking-[0.16em] sm:tracking-[0.28em] font-light shrink-0 ${
              dark ? "text-white" : ""
            }`}
          >
            INTER<span className="font-semibold">TEXE</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${linkTone(item.href)}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <Link
            href="/dashboard/login"
            className={
              dark
                ? "inline-flex items-center gap-2 rounded-md border border-white px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-white min-h-[40px] hover:bg-white/10"
                : "inline-flex items-center gap-2 rounded-md border border-[#152238] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-[#152238] min-h-[40px] hover:bg-[#152238]/5"
            }
          >
            Log in
            <Arrow />
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=nav"
            className={
              dark
                ? "inline-flex items-center gap-2 rounded-md bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-[#152238] min-h-[40px] hover:bg-[#f7f5f1]"
                : "inline-flex items-center gap-2 rounded-md bg-[#152238] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-white min-h-[40px] hover:bg-[#0f1a2c]"
            }
          >
            Book a demo
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

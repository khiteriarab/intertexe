"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/platform/demo", label: "Demo" },
  { href: "/platform/docs", label: "Documentation" },
];

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
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
        <Link
          href="/platform"
          className={`text-[12px] sm:text-sm tracking-[0.16em] sm:tracking-[0.28em] font-light shrink-0 ${
            dark ? "text-white" : ""
          }`}
        >
          INTER<span className="font-semibold">TEXE</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
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
          <Link
            href="/dashboard/login"
            className={`text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase whitespace-nowrap min-h-[40px] inline-flex items-center ${
              dark ? "text-white/80 hover:text-white" : "text-[#6f6a63] hover:text-black"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=nav"
            className={
              dark
                ? "text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase bg-white text-[#152238] px-3 sm:px-5 py-2 sm:py-2.5 hover:bg-[#f7f5f1] whitespace-nowrap min-h-[40px] inline-flex items-center"
                : "text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase bg-[#152238] text-white px-3 sm:px-5 py-2 sm:py-2.5 hover:bg-[#0f1a2c] whitespace-nowrap min-h-[40px] inline-flex items-center"
            }
          >
            Book a demo
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
          <Link
            href="/dashboard/login"
            onClick={() => setOpen(false)}
            className={`block py-3 text-[13px] tracking-[0.14em] uppercase ${
              dark ? "text-white/80" : "text-[#6f6a63]"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=nav"
            onClick={() => setOpen(false)}
            className={`block py-3 text-[13px] tracking-[0.14em] uppercase ${dark ? "text-white" : "text-black"}`}
          >
            Book a demo
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

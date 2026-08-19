"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/platform/demo", label: "Demo" },
  { href: "/platform/docs", label: "Documentation" },
  { href: "/dashboard/login", label: "Login" },
];

export function PlatformNav({
  active,
}: {
  active?: "demo" | "docs" | "request" | "platform" | "login";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tone = (href: string) =>
    (active === "demo" && href === "/platform/demo") ||
    (active === "docs" && href === "/platform/docs") ||
    (active === "login" && href === "/dashboard/login")
      ? "text-black"
      : "text-[#6f6a63] hover:text-black";

  return (
    <nav className="border-b border-[#e8e3da]">
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
        <Link
          href="/platform"
          className="text-[12px] sm:text-sm tracking-[0.16em] sm:tracking-[0.28em] font-light shrink-0"
        >
          INTER<span className="font-semibold">TEXE</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${tone(item.href)}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            href="/platform/request?intent=snapshot"
            className="text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase bg-[#1d4734] text-white px-3 sm:px-5 py-2 sm:py-2.5 hover:bg-[#163828] whitespace-nowrap min-h-[40px] inline-flex items-center"
          >
            <span className="sm:hidden">Snapshot</span>
            <span className="hidden sm:inline">Request snapshot</span>
          </Link>
          <button
            type="button"
            className="md:hidden text-[10px] tracking-[0.12em] uppercase text-[#6f6a63] min-h-[40px] px-1"
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
          className="md:hidden border-t border-[#e8e3da] px-4 pb-4 pt-2 bg-[#f7f5f1]"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block py-3 text-[13px] tracking-[0.14em] uppercase ${tone(item.href)}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

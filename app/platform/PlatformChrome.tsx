import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/platform/demo", label: "Demo" },
  { href: "/platform/docs", label: "Documentation", shortLabel: "Docs" },
  { href: "/dashboard/login", label: "Login" },
];

export function PlatformChrome({
  children,
  active,
}: {
  children: ReactNode;
  active?: "demo" | "docs" | "request" | "platform" | "login";
}) {
  return (
    <div className="min-h-screen bg-[#f7f5f1] text-[#161513] overflow-x-hidden">
      <nav className="border-b border-[#e8e3da] px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
        <Link
          href="/platform"
          className="text-[12px] sm:text-sm tracking-[0.16em] sm:tracking-[0.28em] font-light shrink-0"
        >
          INTER<span className="font-semibold">TEXE</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
                (active === "demo" && item.href === "/platform/demo") ||
                (active === "docs" && item.href === "/platform/docs") ||
                (active === "login" && item.href === "/dashboard/login")
                  ? "text-black"
                  : "text-[#6f6a63] hover:text-black"
              }`}
            >
              {item.shortLabel ? (
                <>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </Link>
          ))}
          <Link
            href="/platform/request?intent=snapshot"
            className="text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase bg-[#1d4734] text-white px-3 sm:px-5 py-2 sm:py-2.5 hover:bg-[#163828] whitespace-nowrap"
          >
            <span className="sm:hidden">Snapshot</span>
            <span className="hidden sm:inline">Request snapshot</span>
          </Link>
        </div>
      </nav>
      {children}
      <footer className="border-t border-[#e8e3da] px-4 sm:px-6 md:px-8 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-4">
          <p className="text-xs text-[#8a847c]">INTERTEXE · Digital Product Passports for fashion</p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Link href="/" className="text-xs text-[#8a847c] hover:text-black">
              Consumer
            </Link>
            <Link href="/platform" className="text-xs text-[#8a847c] hover:text-black">
              Platform
            </Link>
            <Link href="/platform/demo" className="text-xs text-[#8a847c] hover:text-black">
              Demo
            </Link>
            <Link href="/dashboard/login" className="text-xs text-[#8a847c] hover:text-black">
              Login
            </Link>
            <Link href="/privacy" className="text-xs text-[#8a847c] hover:text-black">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-[#8a847c] hover:text-black">
              Terms
            </Link>
            <a href="mailto:info@intertexe.com" className="text-xs text-[#8a847c] hover:text-black">
              info@intertexe.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

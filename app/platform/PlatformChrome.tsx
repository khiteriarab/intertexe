import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/platform/demo", label: "Demo" },
  { href: "/platform/docs", label: "Documentation" },
  { href: "/platform/login", label: "Log in" },
];

export function PlatformChrome({
  children,
  active,
}: {
  children: ReactNode;
  active?: "demo" | "docs" | "login" | "platform";
}) {
  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#1a1a1a]">
      <nav className="border-b border-[#ddd5cb] px-6 md:px-8 py-5 flex items-center justify-between gap-4">
        <Link href="/platform" className="text-sm tracking-[0.3em] font-light shrink-0">
          INTER<span className="font-semibold">TEXE</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-8 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
                active && item.href.endsWith(`/${active}`)
                  ? "text-black"
                  : "text-[#5c5854] hover:text-black"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/platform/demo#snapshot"
            className="text-[11px] tracking-[0.15em] uppercase bg-black text-white px-5 py-2.5 hover:bg-[#2a2a2a] transition-colors whitespace-nowrap"
          >
            Request access
          </Link>
        </div>
      </nav>
      {children}
      <footer className="border-t border-[#ddd5cb] px-6 md:px-8 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-[#8a847c]">© 2026 Intertexe. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="text-xs text-[#8a847c] hover:text-black">
              Consumer platform
            </Link>
            <Link href="/platform" className="text-xs text-[#8a847c] hover:text-black">
              Platform
            </Link>
            <Link href="/privacy" className="text-xs text-[#8a847c] hover:text-black">
              Privacy
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

import type { ReactNode } from "react";
import Link from "next/link";
import { PlatformNav, type PlatformNavKey } from "./PlatformNav";

export function PlatformChrome({
  children,
  active,
}: {
  children: ReactNode;
  active?: PlatformNavKey;
}) {
  return (
    <div className="min-h-screen bg-[#f7f5f1] text-[#161513] overflow-x-hidden">
      <PlatformNav active={active} tone={active === "platform" || active === "demo" ? "dark" : "light"} />
      {children}
      <footer className="border-t border-[#e8e3da] px-4 sm:px-6 md:px-8 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-4">
          <p className="text-xs text-[#8a847c]">INTERTEXE · Material intelligence for fashion</p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Link href="/" className="text-xs text-[#8a847c] hover:text-black">
              Consumer
            </Link>
            <Link href="/platform" className="text-xs text-[#8a847c] hover:text-black">
              Platform
            </Link>
            <Link href="/platform/discover" className="text-xs text-[#8a847c] hover:text-black">
              Discover
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

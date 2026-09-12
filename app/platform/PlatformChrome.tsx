import type { ReactNode } from "react";
import Link from "next/link";
import { PlatformNav, type PlatformNavKey } from "./PlatformNav";
import { PlatformWordmark } from "./PlatformWordmark";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import "./platform-tokens.css";
import "./b2b-visuals.css";

export function PlatformChrome({
  children,
  active,
}: {
  children: ReactNode;
  active?: PlatformNavKey;
}) {
  return (
    <div className="platform-shell platform-editorial min-h-screen">
      <PlatformNav active={active} tone="light" />
      {children}
      <footer className="border-t border-[var(--platform-border)] px-4 sm:px-6 md:px-8 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] bg-[var(--platform-surface)]">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <PlatformWordmark size="sm" className="text-[var(--platform-ink)] mb-3" />
            <p className="text-xs text-[var(--platform-quiet)] max-w-xs leading-relaxed">
              Product intelligence infrastructure for fashion — govern one record, deliver consumer experiences your way.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-[var(--platform-quiet)]">
            <Link href="/" className="hover:text-[var(--platform-ink)] transition-colors">
              Consumer
            </Link>
            <Link href="/platform" className="hover:text-[var(--platform-ink)] transition-colors">
              Platform
            </Link>
            <Link href="/platform/discover" className="hover:text-[var(--platform-ink)] transition-colors">
              Discover
            </Link>
            <Link href="/platform/demo" className="hover:text-[var(--platform-ink)] transition-colors">
              Demo
            </Link>
            <Link href="/platform/docs" className="hover:text-[var(--platform-ink)] transition-colors">
              API
            </Link>
            <Link href={getEnterpriseLoginUrl()} className="hover:text-[var(--platform-ink)] transition-colors">
              Sign in
            </Link>
            <Link href="/privacy" className="hover:text-[var(--platform-ink)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--platform-ink)] transition-colors">
              Terms
            </Link>
            <a href="mailto:info@intertexe.com" className="hover:text-[var(--platform-ink)] transition-colors">
              info@intertexe.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { PlatformNav, type PlatformNavKey } from "./PlatformNav";
import { PlatformWordmark } from "./PlatformWordmark";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import "./platform-tokens.css";
import "./b2b-visuals.css";
import "./platform-saas.css";
import "./platform-luxury.css";

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
      <footer className="platform-lux-footer">
        <div className="platform-lux-footer-inner">
          <div>
            <PlatformWordmark size="sm" className="text-[var(--platform-ink)]" />
            <p className="platform-lux-footer-lead">
              Product intelligence infrastructure for fashion — govern one record, deliver consumer experiences your way.
            </p>
          </div>
          <div className="platform-lux-footer-col">
            <p className="platform-lux-footer-heading">Platform</p>
            <Link href="/platform">Product Record</Link>
            <Link href="/platform#delivery">DPP</Link>
            <Link href="/platform#api">API</Link>
            <Link href="/platform/demo">See it live</Link>
          </div>
          <div className="platform-lux-footer-col">
            <p className="platform-lux-footer-heading">Company</p>
            <Link href="/">About</Link>
            <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
            <a href="mailto:info@intertexe.com">Contact</a>
            <span dangerouslySetInnerHTML={{ __html: "<!--email_on-->" }} />
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href={getEnterpriseLoginUrl()}>Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

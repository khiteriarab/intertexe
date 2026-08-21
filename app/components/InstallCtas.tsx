"use client";

import { getAppStoreOpenUrl } from "../../lib/app-store";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";

function AppleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-1-3-.9c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8s1.8.8 3 .8 2-.1 3-2.3c1.1-1.5 1.5-3 1.5-3.1-.1 0-2.9-1.1-2.9-4.2zM14.6 6.3c.6-.8 1.1-1.9.9-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}

function ChromeMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#fff" />
      <path fill="#EA4335" d="M24 4a20 20 0 0 1 17.3 10H24a10 10 0 0 0-8.7 5L7.4 9.7A20 20 0 0 1 24 4z" />
      <path fill="#FBBC05" d="M7.4 9.7 15.3 19A10 10 0 0 0 24 34v10A20 20 0 0 1 7.4 9.7z" />
      <path fill="#34A853" d="M24 44V34a10 10 0 0 0 8.7-5l7.9 9.3A20 20 0 0 1 24 44z" />
      <path fill="#4285F4" d="M41.3 14H24a10 10 0 0 1 8.7 15l7.9-9.3A20 20 0 0 0 41.3 14z" />
      <circle cx="24" cy="24" r="8" fill="#fff" />
      <circle cx="24" cy="24" r="6" fill="#4285F4" />
    </svg>
  );
}

/** Phone header: iOS App chip. Desktop header: iOS App + Add to Chrome. */
export function InstallCtas() {
  const iosHref = getAppStoreOpenUrl("/scanner", undefined, { cta: "nav_ios_app" });
  const chromeHref = getChromeWebStoreUrl();

  return (
    <>
      <a
        href={iosHref}
        className="md:hidden inline-flex items-center gap-1.5 rounded-full bg-[#1C2B2A] text-white pl-2.5 pr-3 py-1.5 text-[11px] tracking-wide shrink-0"
        data-testid="link-nav-ios-app-mobile"
      >
        <AppleMark className="w-3.5 h-3.5" />
        iOS App
      </a>
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <a
          href={iosHref}
          className="inline-flex items-center gap-1.5 text-[13px] text-foreground hover:text-foreground/70 transition-colors whitespace-nowrap"
          data-testid="link-nav-ios-app"
        >
          <AppleMark className="w-3.5 h-3.5" />
          iOS App
        </a>
        <a
          href={chromeHref}
          className="inline-flex items-center gap-2 rounded-full bg-[#1C2B2A] text-white pl-2.5 pr-3.5 py-1.5 text-[13px] hover:bg-[#2A3B3A] transition-colors whitespace-nowrap"
          data-testid="link-nav-add-to-chrome"
        >
          <ChromeMark className="w-4 h-4" />
          Add to Chrome
        </a>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "intertexe_signin_banner_dismissed";
const TOKEN_KEY = "intertexe_auth_token";

/** Slim strip below navbar — dismissible, does not cover hero content. */
export function SignInBenefitsBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      setHidden(false);
    } catch {
      setHidden(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss sign-in prompt"
        className="fixed inset-0 z-[35] bg-transparent cursor-default md:hidden"
        onClick={dismiss}
      />
      <section
        className="relative z-40 border-b border-[#E8E8E8] bg-white/95 backdrop-blur-sm px-4 md:px-8 py-2.5"
        data-testid="signin-benefits-banner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 flex-wrap">
          <p className="text-[11px] text-[#1C1C1E] leading-snug flex-1 min-w-[200px]">
            Sign in to save favourites and sync your preferences.
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/account"
              className="text-[10px] uppercase tracking-[0.14em] text-[#1C1C1E] hover:opacity-70"
            >
              Sign in
            </Link>
            <Link
              href="/account?mode=signup"
              className="text-[10px] uppercase tracking-[0.14em] text-[#1C1C1E] hover:opacity-70"
            >
              Create account
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-[#8E8E93] hover:text-[#1C1C1E] p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

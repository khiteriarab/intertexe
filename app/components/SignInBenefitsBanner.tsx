"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "intertexe_signin_banner_dismissed";
const TOKEN_KEY = "intertexe_auth_token";

/** NET-A-PORTER style sign-in prompt — web header strip. */
export function SignInBenefitsBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) return;
      if (sessionStorage.getItem(DISMISS_KEY)) return;
      setHidden(false);
    } catch {
      setHidden(true);
    }
  }, []);

  if (hidden) return null;

  return (
    <section
      className="border-b border-border/30 bg-[#FAFAF8] px-4 md:px-8 py-6 md:py-8"
      data-testid="signin-benefits-banner"
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-4">
        <h2 className="text-xl md:text-2xl font-serif tracking-tight">
          Sign in to enjoy more benefits
        </h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Enter your account details to access exclusive rewards, saved favorites, and quiz
          recommendations across devices.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-center">
          <Link
            href="/account?mode=signup"
            className="px-8 py-3.5 text-[10px] uppercase tracking-[0.18em] border border-foreground hover:bg-foreground hover:text-background transition-colors text-center"
          >
            Create account
          </Link>
          <Link
            href="/account"
            className="px-8 py-3.5 text-[10px] uppercase tracking-[0.18em] bg-foreground text-background hover:bg-foreground/90 transition-colors text-center"
          >
            Sign in
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setHidden(true);
          }}
          className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground mt-1"
        >
          Continue browsing
        </button>
      </div>
    </section>
  );
}

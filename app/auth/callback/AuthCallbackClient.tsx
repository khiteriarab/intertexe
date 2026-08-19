"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "../../../lib/supabase/client";
import { setWebAuthTokens } from "../../../lib/web-auth-token";
import { accountAuthHref, safeLoginReturnPath } from "../../../lib/auth-return-path";

function parseHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#/, "");
  const out: Record<string, string> = {};
  for (const part of raw.split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

export default function AuthCallbackClient() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClientComponentClient();
        const hash = parseHashParams();
        const code = params.get("code");
        if (hash.access_token) {
          await supabase.auth.setSession({
            access_token: hash.access_token,
            refresh_token: hash.refresh_token || "",
          });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          setWebAuthTokens(token, data.session?.refresh_token || null);
        }
        const next = safeLoginReturnPath(params.get("next")) || (token ? "/account" : accountAuthHref("login"));
        if (!cancelled) window.location.replace(next);
      } catch {
        if (!cancelled) {
          setError("Could not finish signing in. Open INTERTEXE and try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-2xl">Sign-in did not finish</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        <Link href={accountAuthHref("login")} className="mt-6 text-sm underline underline-offset-4">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </main>
  );
}

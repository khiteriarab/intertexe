"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "../../lib/supabase/client";

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

/**
 * When Confirm email opens in Safari/Gmail instead of the app, complete the
 * session here and offer Open INTERTEXE.
 */
export function AuthConfirmBridge() {
  const [ready, setReady] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const hash = parseHashParams();
    const type = hash.type || new URLSearchParams(window.location.search).get("type") || "";
    const code = new URLSearchParams(window.location.search).get("code");
    const isAuth = type === "signup" || type === "recovery" || Boolean(code) || Boolean(hash.access_token);
    if (!isAuth) return;

    let cancelled = false;
    (async () => {
      if (hash.access_token && hash.refresh_token) {
        await supabase.auth.setSession({
          access_token: hash.access_token,
          refresh_token: hash.refresh_token,
        });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        try {
          await fetch("/api/auth/send-welcome", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });
        } catch {
          // welcome is idempotent; ignore
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-md px-6 py-4 text-center text-sm text-neutral-700">
      <p>Your email is confirmed.</p>
      <a
        href="https://www.intertexe.com/open?next=/account&itx_cta=email_confirm"
        className="mt-3 inline-block underline underline-offset-4"
      >
        Open INTERTEXE
      </a>
    </div>
  );
}

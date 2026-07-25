"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

type Phase = "idle" | "signing_in" | "opening" | "forgot";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("info@intertexe.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    params.get("reset") === "1" ? "Check your email to finish resetting your password." : null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [forgotMode, setForgotMode] = useState(false);
  const inviteToken = params.get("invite");
  const busy = phase !== "idle";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      if (forgotMode) {
        setPhase("forgot");
        const res = await fetch("/api/dashboard/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setInfo(data.message || "If that account exists, a reset link has been sent.");
        setPhase("idle");
        return;
      }

      setPhase("signing_in");
      const res = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Sign-in failed.");
        setPhase("idle");
        return;
      }
      if (inviteToken) {
        const acc = await fetch("/api/dashboard/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        const accData = await acc.json();
        if (!acc.ok) {
          setError(accData.message || "Invite could not be accepted.");
          setPhase("idle");
          return;
        }
        if (accData.workspaceId) {
          await fetch("/api/dashboard/workspaces", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId: accData.workspaceId }),
          });
        }
      }
      // Keep the loading state until navigation finishes — overview can take a while.
      setPhase("opening");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPhase("idle");
    }
  }

  const buttonLabel =
    phase === "signing_in"
      ? "Signing in…"
      : phase === "opening"
        ? "Opening dashboard…"
        : phase === "forgot"
          ? "Sending…"
          : forgotMode
            ? "Send reset link"
            : "Sign in";

  return (
    <div className="min-h-screen bg-[#f6f5f3] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-black/10 rounded-2xl p-8 shadow-sm">
        <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">INTERTEXE Dashboard</p>
        <h1 className="text-2xl font-medium mt-2">Secure sign-in</h1>
        <p className="text-sm text-black/55 mt-2">
          INTERTEXE Dashboard — private operating system for material intelligence. Not linked from the consumer site or
          app.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" aria-busy={busy}>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-black/50">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-black disabled:opacity-60"
              autoComplete="username"
            />
          </label>

          {!forgotMode ? (
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-black/50">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-black disabled:opacity-60"
                autoComplete="current-password"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {info ? <p className="text-sm text-black/60">{info}</p> : null}

          {phase === "opening" ? (
            <div
              className="rounded-lg border border-black/10 bg-[#f6f5f3] px-3 py-3 text-sm text-black/70"
              role="status"
              aria-live="polite"
            >
              <p className="font-medium text-black/85">Signed in — loading your workspace</p>
              <p className="mt-1 text-xs text-black/50 leading-relaxed">
                Pulling overview metrics. This can take up to a minute on first load.
              </p>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/10">
                <div className="hq-login-bar h-full w-1/3 rounded-full bg-black" />
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-black text-white text-xs tracking-[0.18em] uppercase py-3 rounded-lg disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-black/50">
          <button
            type="button"
            className="hover:text-black disabled:opacity-40"
            disabled={busy}
            onClick={() => setForgotMode((v) => !v)}
          >
            {forgotMode ? "Back to sign-in" : "Forgot password"}
          </button>
          <Link href="/platform" className="hover:text-black">
            Public platform →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes hqLoginBar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .hq-login-bar {
          animation: hqLoginBar 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function HqLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f5f3]" />}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("info@intertexe.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    params.get("reset") === "1" ? "Check your email to finish resetting your password." : null
  );
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const inviteToken = params.get("invite");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (forgotMode) {
        const res = await fetch("/api/dashboard/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setInfo(data.message || "If that account exists, a reset link has been sent.");
        return;
      }

      const res = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Sign-in failed.");
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
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f3] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-black/10 rounded-2xl p-8 shadow-sm">
        <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">INTERTEXE Dashboard</p>
        <h1 className="text-2xl font-medium mt-2">Secure sign-in</h1>
        <p className="text-sm text-black/55 mt-2">
          INTERTEXE Dashboard — private operating system for material intelligence. Not linked from the consumer site or
          app.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-black/50">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-black"
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
                className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-black"
                autoComplete="current-password"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {info ? <p className="text-sm text-black/60">{info}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white text-xs tracking-[0.18em] uppercase py-3 rounded-lg disabled:opacity-60"
          >
            {loading ? "Please wait…" : forgotMode ? "Send reset link" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-black/50">
          <button type="button" className="hover:text-black" onClick={() => setForgotMode((v) => !v)}>
            {forgotMode ? "Back to sign-in" : "Forgot password"}
          </button>
          <Link href="/platform" className="hover:text-black">
            Public platform →
          </Link>
        </div>
      </div>
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

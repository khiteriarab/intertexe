"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./login.css";

type Phase = "idle" | "signing_in" | "opening" | "forgot";
type AuthMode = "email" | "sso";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    params.get("reset") === "1" ? "Check your email to finish resetting your password." : null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [forgotMode, setForgotMode] = useState(false);
  const inviteToken = params.get("invite");
  const busy = phase !== "idle";

  const canSubmitEmail =
    authMode === "email" &&
    !busy &&
    email.trim().length > 0 &&
    (forgotMode || password.length > 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (authMode === "sso") return;
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
      const next = params.get("next");
      const res = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Sign-in failed.");
        setPhase("idle");
        return;
      }
      let destination = typeof data.redirectTo === "string" ? data.redirectTo : "/dashboard";
      if (inviteToken) {
        const acc = await fetch("/api/dashboard/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        if (!acc.ok) {
          const ent = await fetch("/api/dashboard/enterprise/invitations/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inviteToken }),
          });
          if (!ent.ok) {
            setInfo("Signed in. The invitation could not be applied automatically.");
          } else {
            const entData = await ent.json();
            if (typeof entData.redirectTo === "string") destination = entData.redirectTo;
          }
        } else {
          const accData = await acc.json();
          if (accData.workspaceId) {
            await fetch("/api/dashboard/workspaces", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspaceId: accData.workspaceId }),
            });
          }
        }
      }
      setPhase("opening");
      router.replace(destination);
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
        ? "Opening workspace…"
        : phase === "forgot"
          ? "Sending…"
          : forgotMode
            ? "Send reset link"
            : "Log in";

  return (
    <div className="ent-login-page">
      <div className="ent-login-brand">
        <div className="ent-login-brand-inner">
          <div className="ent-login-brand-lockup">
            <Image
              src="/app-icon.png"
              alt=""
              width={48}
              height={48}
              className="ent-login-brand-mark"
              priority
            />
            <span className="ent-login-brand-wordmark">
              <span className="ent-login-wordmark-light">INTER</span>
              <span className="ent-login-wordmark-bold">TEXE</span>
            </span>
          </div>
          <p className="ent-login-brand-tagline">
            Material intelligence for brands.
            <br />
            Digital product passports at your fingertips.
          </p>
        </div>
      </div>

      <div className="ent-login-card-wrap">
        <div className="ent-login-card">
          <h1 className="ent-login-title">{authMode === "sso" ? "Enterprise sign-on" : "Welcome back"}</h1>
          <p className="ent-login-lead">
            {authMode === "sso"
              ? "Single sign-on is available for enterprise accounts on the INTERTEXE material intelligence platform."
              : forgotMode
                ? "Enter the email address for your workspace account and we will send a password reset link."
                : "Sign in with the email and password for your brand workspace — catalog, passports, and material intelligence in one place."}
          </p>

          {authMode === "sso" ? (
            <div className="ent-login-sso-panel">
              <Link href="/platform/request" className="ent-login-sso-link">
                Request enterprise access →
              </Link>
              <button
                type="button"
                className="ent-login-sso-secondary"
                disabled={busy}
                onClick={() => {
                  setAuthMode("email");
                  setError(null);
                }}
              >
                Back to email sign-in
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} aria-busy={busy}>
              <label className="ent-login-field" htmlFor="login-email">
                <span className="ent-login-label">Email</span>
                <div className="ent-login-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    placeholder="example@email.com"
                    className="ent-login-input"
                    autoComplete="username"
                  />
                </div>
              </label>

              {!forgotMode ? (
                <label className="ent-login-field" htmlFor="login-password">
                  <span className="ent-login-label">Password</span>
                  <div className="ent-login-input-wrap">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      placeholder="Password"
                      className="ent-login-input"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="ent-login-input-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                    </button>
                  </div>
                </label>
              ) : null}

              {error ? <p className="ent-login-message ent-login-message-error">{error}</p> : null}
              {info ? <p className="ent-login-message ent-login-message-info">{info}</p> : null}

              {phase === "opening" ? (
                <div className="ent-login-opening" role="status" aria-live="polite">
                  <p className="font-semibold text-[#3e6268]">Signed in — loading your workspace</p>
                  <p className="mt-1 text-xs leading-relaxed">Pulling overview metrics. This can take a moment on first load.</p>
                  <div className="ent-login-opening-bar">
                    <div className="ent-login-opening-bar-inner" />
                  </div>
                </div>
              ) : null}

              <button type="submit" disabled={!canSubmitEmail} className="ent-login-submit">
                {buttonLabel}
              </button>

              <button
                type="button"
                className="ent-login-forgot"
                disabled={busy}
                onClick={() => {
                  setForgotMode((v) => !v);
                  setError(null);
                  setInfo(null);
                }}
              >
                {forgotMode ? "Back to sign-in" : "I forgot my password"}
              </button>

              <div className="ent-login-divider" role="presentation">
                <span>Or sign in with</span>
              </div>

              <button
                type="button"
                className="ent-login-sso-secondary"
                disabled={busy}
                onClick={() => {
                  setAuthMode("sso");
                  setForgotMode(false);
                  setError(null);
                }}
              >
                Single sign-on
              </button>
            </form>
          )}

          <div className="ent-login-footer">
            <Link href="/">Consumer site</Link>
            <span aria-hidden>·</span>
            <Link href="/platform">Platform</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HqLoginPage() {
  return (
    <Suspense fallback={<div className="ent-login-page" />}>
      <LoginForm />
    </Suspense>
  );
}

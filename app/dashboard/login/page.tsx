"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./login.css";

type Phase = "idle" | "signing_in" | "opening" | "forgot";
type AuthTab = "email" | "sso";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    params.get("reset") === "1" ? "Check your email to finish resetting your password." : null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [forgotMode, setForgotMode] = useState(false);
  const inviteToken = params.get("invite");
  const busy = phase !== "idle";

  const canSubmitEmail =
    authTab === "email" &&
    !busy &&
    email.trim().length > 0 &&
    (forgotMode || password.length > 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (authTab === "sso") return;
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
      <div className="ent-login-card">
        <div className="ent-login-logo">
          <Image
            src="/app-icon.png"
            alt=""
            width={52}
            height={52}
            className="ent-login-logo-mark"
            priority
          />
          <span className="ent-login-wordmark">
            <span className="ent-login-wordmark-light">INTER</span>
            <span className="ent-login-wordmark-bold">TEXE</span>
          </span>
        </div>

        <h1 className="ent-login-title">Welcome</h1>

        <div className="ent-login-tabs" role="tablist" aria-label="Sign-in method">
          <button
            type="button"
            role="tab"
            aria-selected={authTab === "email"}
            className={`ent-login-tab ${authTab === "email" ? "ent-login-tab-active" : "ent-login-tab-inactive"}`}
            onClick={() => {
              setAuthTab("email");
              setForgotMode(false);
              setError(null);
            }}
            disabled={busy}
          >
            Login with email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authTab === "sso"}
            className={`ent-login-tab ${authTab === "sso" ? "ent-login-tab-active" : "ent-login-tab-inactive"}`}
            onClick={() => {
              setAuthTab("sso");
              setForgotMode(false);
              setError(null);
            }}
            disabled={busy}
          >
            Login with SSO
          </button>
        </div>

        {authTab === "sso" ? (
          <div className="ent-login-sso-panel">
            <p className="ent-login-sso-copy">
              Single sign-on is available for enterprise accounts on the INTERTEXE material intelligence
              platform. Contact your account team or request a pilot to enable SAML/OIDC for your organization.
            </p>
            <Link href="/platform/request" className="ent-login-sso-link">
              Request enterprise access →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} aria-busy={busy}>
            <div className="ent-login-field">
              <div className="ent-login-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  placeholder="Enter your email address"
                  className="ent-login-input"
                  autoComplete="username"
                />
              </div>
            </div>

            {!forgotMode ? (
              <div className="ent-login-field">
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
              </div>
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
          </form>
        )}

        <div className="ent-login-footer">
          <Link href="/">Consumer site</Link>
          <Link href="/platform">Platform</Link>
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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getConsumerAccountUrl } from "@/lib/platform-urls";
import "./login.css";

type Phase = "idle" | "signing_in" | "opening" | "forgot" | "sso";

type SsoDiscovery = {
  ssoAvailable: boolean;
  ssoRequired?: boolean;
  passwordAllowed?: boolean;
  providerLabel?: string;
};

const SSO_ERRORS: Record<string, string> = {
  invalid_callback: "SSO sign-in could not be completed. Try again.",
  expired_state: "Your SSO session expired. Start again from the login page.",
  exchange_failed: "We could not verify your organization sign-in.",
  not_authorized: "Your organization account is not authorized for workspace access.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    SSO_ERRORS[params.get("sso_error") || ""] || null
  );
  const [info, setInfo] = useState<string | null>(
    params.get("reset") === "1" ? "Check your email to finish resetting your password." : null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [forgotMode, setForgotMode] = useState(false);
  const [discovery, setDiscovery] = useState<SsoDiscovery | null>(null);
  const inviteToken = params.get("invite");
  const busy = phase !== "idle";

  const passwordAllowed = !discovery?.ssoAvailable || !discovery.ssoRequired || discovery.passwordAllowed !== false;
  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showSso = !forgotMode;

  const refreshDiscovery = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setDiscovery(null);
      return;
    }
    try {
      const res = await fetch(`/api/dashboard/sso/discover?email=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as SsoDiscovery;
      setDiscovery(data.ssoAvailable ? data : null);
    } catch {
      setDiscovery(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshDiscovery(email);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [email, refreshDiscovery]);

  const canSubmit =
    !busy && email.trim().length > 0 && (forgotMode || (passwordAllowed && password.length > 0));

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

  async function onSsoContinue() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your work email first.");
      return;
    }
    setPhase("sso");
    try {
      const res = await fetch("/api/dashboard/sso/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.redirectUrl !== "string") {
        setError(data.message || "SSO is not available for this email domain.");
        setPhase("idle");
        return;
      }
      window.location.assign(data.redirectUrl);
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
          : phase === "sso"
            ? "Redirecting…"
            : forgotMode
              ? "Send reset link"
              : "Sign in";

  const consumerAccountUrl = getConsumerAccountUrl();

  return (
    <div className="ent-login-page">
      <div className="ent-login-brand">
        <div className="ent-login-brand-art" aria-hidden>
          <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" fill="none">
            <path
              d="M-40 720 C180 640 260 820 420 760 S640 680 860 820 L860 920 L-40 920 Z"
              fill="rgba(44,38,32,0.08)"
            />
            <path
              d="M640 40 C720 120 780 80 820 160 C860 240 780 300 700 260 C620 220 560 120 640 40 Z"
              fill="rgba(201,169,98,0.12)"
            />
            <path
              d="M0 420 Q200 360 340 400 T680 380"
              stroke="rgba(44,38,32,0.1)"
              strokeWidth="1.5"
            />
            <path
              d="M80 520 Q260 480 400 510 T720 490"
              stroke="rgba(196,165,116,0.35)"
              strokeWidth="1"
            />
          </svg>
        </div>
        <p className="ent-login-brand-edge">Trace · Measure · Govern · Publish</p>
        <div className="ent-login-brand-inner">
          <p className="ent-login-brand-wordmark">
            <span className="ent-login-wordmark-light">INTER</span>
            <span className="ent-login-wordmark-bold">TEXE</span>
          </p>
          <h1 className="ent-login-brand-statement">
            Your product data,
            <br />
            connected.
          </h1>
          <p className="ent-login-brand-tagline">Product intelligence for fashion.</p>
          <div className="ent-login-brand-motif" aria-hidden>
            <svg viewBox="0 0 280 100" className="ent-login-brand-motif-svg" fill="none">
              <path
                d="M20 18 H100 M20 50 H88 M20 82 H96"
                stroke="rgba(44,38,32,0.18)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M100 18 C160 18 180 50 220 50 M88 50 C150 50 170 50 220 50 M96 82 C158 82 178 50 220 50"
                stroke="rgba(44,38,32,0.12)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <rect x="220" y="38" width="48" height="24" rx="2" stroke="rgba(44,38,32,0.28)" strokeWidth="1" />
              <path d="M228 50 H260" stroke="rgba(44,38,32,0.2)" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <ol className="ent-login-brand-motif-steps">
              <li>Product data</li>
              <li>Normalized</li>
              <li>Governed</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="ent-login-auth">
        <div className="ent-login-auth-inner">
          <div className="ent-login-mobile-brand">
            <p className="ent-login-brand-wordmark ent-login-brand-wordmark-dark">
              <span className="ent-login-wordmark-light">INTER</span>
              <span className="ent-login-wordmark-bold">TEXE</span>
            </p>
          </div>

          <h2 className="ent-login-title">Welcome to INTERTEXE</h2>
          <p className="ent-login-lead">
            {forgotMode
              ? "Enter your work email and we will send a password reset link."
              : "Sign in to your organization workspace."}
          </p>

          <form onSubmit={onSubmit} aria-busy={busy}>
            <label className="ent-login-field" htmlFor="login-email">
              <span className="ent-login-label">Work email</span>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="you@brand.com"
                className="ent-login-input"
                autoComplete="username"
              />
            </label>

            {!forgotMode && passwordAllowed ? (
              <label className="ent-login-field" htmlFor="login-password">
                <span className="ent-login-label">Password</span>
                <div className="ent-login-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required={!showSso || password.length > 0}
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

            {discovery?.ssoAvailable ? (
              <p className="ent-login-message ent-login-message-info">
                {discovery.ssoRequired && !discovery.passwordAllowed
                  ? "Your organization requires SSO."
                  : "Single sign-on is available for your organization."}
              </p>
            ) : null}

            {error ? <p className="ent-login-message ent-login-message-error">{error}</p> : null}
            {info ? <p className="ent-login-message ent-login-message-info">{info}</p> : null}

            {phase === "opening" ? (
              <div className="ent-login-opening" role="status" aria-live="polite">
                <p className="font-semibold text-[#2c2620]">Signed in — loading your workspace</p>
                <p className="mt-1 text-xs leading-relaxed">Pulling overview metrics. This can take a moment on first load.</p>
                <div className="ent-login-opening-bar">
                  <div className="ent-login-opening-bar-inner" />
                </div>
              </div>
            ) : null}

            {passwordAllowed ? (
              <button type="submit" disabled={!canSubmit} className="ent-login-submit">
                {buttonLabel}
              </button>
            ) : null}

            {!forgotMode && passwordAllowed ? (
              <button
                type="button"
                className="ent-login-forgot"
                disabled={busy}
                onClick={() => {
                  setForgotMode(true);
                  setError(null);
                  setInfo(null);
                }}
              >
                Forgot password?
              </button>
            ) : null}

            {forgotMode ? (
              <button
                type="button"
                className="ent-login-forgot"
                disabled={busy}
                onClick={() => {
                  setForgotMode(false);
                  setError(null);
                  setInfo(null);
                }}
              >
                Back to sign-in
              </button>
            ) : null}
          </form>

          {showSso ? (
            <>
              {passwordAllowed ? <div className="ent-login-divider">OR</div> : null}
              <button
                type="button"
                className="ent-login-sso"
                disabled={busy || !emailReady}
                onClick={() => void onSsoContinue()}
              >
                {phase === "sso" ? "Redirecting…" : "Continue with SSO"}
              </button>
              {discovery?.providerLabel ? (
                <p className="ent-login-sso-hint">via {discovery.providerLabel}</p>
              ) : emailReady ? (
                <p className="ent-login-sso-hint">Single sign-on for your organization domain</p>
              ) : (
                <p className="ent-login-sso-hint">Enter your work email above to use SSO</p>
              )}
            </>
          ) : null}

          <p className="ent-login-consumer-link">
            Personal account? <a href={consumerAccountUrl}>Go to INTERTEXE →</a>
          </p>
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

"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";

const TOKEN_KEY = "intertexe_auth_token";
const REFRESH_KEY = "intertexe_refresh_token";

type Phase = "loading" | "form" | "parking" | "confirm" | "done" | "error";
type Mode = "login" | "signup";

export default function ExtensionAuthClient() {
  const params = useSearchParams();
  const extSession = useMemo(
    () => String(params.get("ext_session") || params.get("extSession") || "").trim(),
    [params]
  );

  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  async function parkSession(accessToken: string, refreshToken: string | null) {
    if (!extSession) {
      setError("Missing extension session. Close this tab and try Sign in from the extension again.");
      setPhase("error");
      return;
    }
    setPhase("parking");
    const res = await fetch("/api/extension/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ext_session: extSession,
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Could not authorize the extension");
    }
    setPhase("done");
  }

  function storeTokens(token: string, refreshToken: string | null) {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!extSession) {
        setError("Open this page from the INTERTEXE Chrome extension (Sign in to INTERTEXE).");
        setPhase("error");
        return;
      }
      const existing = localStorage.getItem(TOKEN_KEY);
      const existingRefresh = localStorage.getItem(REFRESH_KEY);
      if (!existing) {
        setPhase("form");
        return;
      }
      try {
        const me = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${existing}` },
        });
        if (cancelled) return;
        if (!me.ok) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setPhase("form");
          return;
        }
        await parkSession(existing, existingRefresh);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Authorization failed");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extSession]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            username: email.trim(),
            password,
            firstName: firstName.trim() || undefined,
            source: "chrome_extension",
            acquisition_platform: "chrome_extension",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Unable to create account");
        }
        if (data.needsEmailConfirmation || !data.token) {
          setPhase("confirm");
          return;
        }
        storeTokens(data.token, data.refreshToken || null);
        await parkSession(data.token, data.refreshToken || null);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        throw new Error(data.message || "Invalid email or password");
      }
      storeTokens(data.token, data.refreshToken || null);
      await parkSession(data.token, data.refreshToken || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : mode === "signup" ? "Sign up failed" : "Sign in failed");
      setPhase("form");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendConfirmation() {
    setResendNote(null);
    setError(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Unable to resend confirmation");
      }
      setResendNote("Confirmation email sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend confirmation");
    } finally {
      setResending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(160deg, #f7f3ee 0%, #ebe4da 100%)",
        color: "#1a1a1a",
        fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          borderTop: "1px solid #ddd5cb",
          paddingTop: 20,
        }}
      >
        <p
          style={{
            margin: 0,
            letterSpacing: "0.12em",
            fontSize: 13,
            textTransform: "uppercase",
            color: "#6b6560",
          }}
        >
          INTERTEXE
        </p>
        <h1 style={{ margin: "8px 0 6px", fontSize: 28, fontWeight: 600 }}>
          {phase === "confirm"
            ? "Confirm your email"
            : mode === "signup"
              ? "Create your INTERTEXE account"
              : "Sign in to INTERTEXE"}
        </h1>
        <p style={{ margin: "0 0 20px", color: "#6b6560", fontSize: 14, lineHeight: 1.45 }}>
          {phase === "confirm"
            ? "We sent a confirmation email. Confirm, then sign in here to authorize the extension."
            : "Authorize the browser extension to save products to your Inspirations. You can close this tab when you see confirmation."}
        </p>

        {phase === "loading" || phase === "parking" ? (
          <p style={{ color: "#6b6560" }}>
            {phase === "parking" ? "Authorizing extension…" : "Checking your session…"}
          </p>
        ) : null}

        {phase === "done" ? (
          <div>
            <p style={{ fontSize: 16, margin: "0 0 8px" }}>You&apos;re signed in.</p>
            <p style={{ color: "#6b6560", margin: 0, fontSize: 14 }}>
              Return to the product tab — your extension will finish saving automatically.
            </p>
          </div>
        ) : null}

        {phase === "confirm" ? (
          <div>
            {error ? (
              <p style={{ color: "#8b2e2e", fontSize: 13, margin: "0 0 10px" }}>{error}</p>
            ) : null}
            {resendNote ? (
              <p style={{ color: "#1f3d2b", fontSize: 13, margin: "0 0 10px" }}>{resendNote}</p>
            ) : null}
            <button
              type="button"
              disabled={resending || !email.trim()}
              onClick={onResendConfirmation}
              style={buttonStyle}
            >
              {resending ? "Sending…" : "Resend confirmation email"}
            </button>
            <p style={{ marginTop: 14, fontSize: 13, color: "#6b6560" }}>
              Already confirmed?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setPhase("form");
                  setError(null);
                  setResendNote(null);
                }}
                style={linkButtonStyle}
              >
                Sign in
              </button>
            </p>
          </div>
        ) : null}

        {phase === "form" ? (
          <form onSubmit={onSubmit}>
            {mode === "signup" ? (
              <>
                <label style={labelStyle} htmlFor="firstName">
                  First name (optional)
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                />
              </>
            ) : null}
            <label style={{ ...labelStyle, marginTop: mode === "signup" ? 12 : 0 }} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            {error ? (
              <p style={{ color: "#8b2e2e", fontSize: 13, margin: "10px 0 0" }}>{error}</p>
            ) : null}
            <button type="submit" disabled={submitting} style={buttonStyle}>
              {submitting
                ? mode === "signup"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
            <p style={{ marginTop: 14, fontSize: 13, color: "#6b6560" }}>
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    style={linkButtonStyle}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                    style={linkButtonStyle}
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </form>
        ) : null}

        {phase === "error" ? (
          <p style={{ color: "#8b2e2e", fontSize: 14 }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#6b6560",
  marginBottom: 4,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #ddd5cb",
  background: "#fff",
  padding: "10px 12px",
  font: "inherit",
  fontSize: 15,
};

const buttonStyle: CSSProperties = {
  width: "100%",
  marginTop: 16,
  border: "1px solid #1f3d2b",
  background: "#1f3d2b",
  color: "#fff",
  padding: "11px 14px",
  font: "inherit",
  fontSize: 15,
  cursor: "pointer",
};

const linkButtonStyle: CSSProperties = {
  border: 0,
  background: "none",
  padding: 0,
  font: "inherit",
  fontSize: 13,
  color: "#1f3d2b",
  textDecoration: "underline",
  cursor: "pointer",
};

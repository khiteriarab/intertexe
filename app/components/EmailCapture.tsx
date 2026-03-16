"use client";

import { useState } from "react";

interface EmailCaptureProps {
  fiberName?: string;
  variant?: "inline" | "compact";
}

export default function EmailCapture({ fiberName, variant = "inline" }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "needsPassword" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.message || "Something went wrong");
        return;
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        if (data.id) {
          localStorage.setItem("user_id", data.id);
        }
      }

      if (data.needsPassword) {
        setStatus("needsPassword");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Unable to connect. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col gap-2 p-6 md:p-8 bg-secondary/30 border border-border/20" data-testid="email-capture-success">
        <p className="text-sm font-medium">You&apos;re in.</p>
        <p className="text-xs text-muted-foreground">
          We&apos;ll send you the best new {fiberName?.toLowerCase() || "natural fabric"} pieces every week.
        </p>
      </div>
    );
  }

  if (status === "needsPassword") {
    return (
      <div className="flex flex-col gap-2 p-6 md:p-8 bg-secondary/30 border border-border/20" data-testid="email-capture-needs-password">
        <p className="text-sm font-medium">You&apos;re in.</p>
        <p className="text-xs text-muted-foreground">
          We&apos;ll send you the best new {fiberName?.toLowerCase() || "natural fabric"} pieces every week.
        </p>
        <a
          href="/account"
          className="text-[10px] uppercase tracking-[0.15em] text-foreground/70 hover:text-foreground transition-colors mt-1 underline underline-offset-2"
          data-testid="link-complete-account"
        >
          Set a password to save your favorites
        </a>
      </div>
    );
  }

  const headline = fiberName
    ? `Get our weekly edit of the best new ${fiberName.toLowerCase()} pieces`
    : "Get the weekly fabric edit";
  const subline = fiberName
    ? `New verified ${fiberName.toLowerCase()} products, buying tips, and price drops — straight to your inbox.`
    : "New verified products, buying tips, and price drops — straight to your inbox.";

  return (
    <div className="flex flex-col gap-4 p-6 md:p-8 bg-secondary/30 border border-border/20" data-testid="email-capture-form">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/60"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        <h3 className="text-xs uppercase tracking-[0.2em] font-medium">The Weekly Edit</h3>
      </div>
      <p className="text-sm text-foreground/90 font-medium leading-snug">
        {headline}
      </p>
      <p className="text-xs text-foreground/60 leading-relaxed">
        {subline}
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-3 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/40 transition-colors"
          data-testid="input-email-capture"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-3 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-foreground/90 transition-colors disabled:opacity-50"
          data-testid="button-email-submit"
        >
          {status === "loading" ? "..." : "Join"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
      <p className="text-[10px] text-muted-foreground/50">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}

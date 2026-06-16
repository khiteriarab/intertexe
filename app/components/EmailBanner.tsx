"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function EmailBanner() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) return;

    const dismissed = localStorage.getItem("email_banner_dismissed");
    if (dismissed) return;

    let shown = false;
    const show = () => {
      if (shown) return;
      const tokenNow = localStorage.getItem("auth_token");
      if (!tokenNow) {
        shown = true;
        setVisible(true);
      }
    };

    const timer = setTimeout(show, 90000);

    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight <= 0) return;
      const scrollDepth = (window.scrollY + window.innerHeight) / docHeight;
      if (scrollDepth >= 0.7) show();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("email_banner_dismissed", Date.now().toString());
  };

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
        if (data.id) localStorage.setItem("user_id", data.id);
      }

      setStatus("success");
      setTimeout(() => setVisible(false), 2500);
    } catch {
      setStatus("error");
      setErrorMsg("Unable to connect. Please try again.");
    }
  };

  if (!visible) return null;

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-[60] w-full bg-[#111] text-white shadow-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="email-banner"
    >
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-4 md:py-5">
        {status === "success" ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            <span className="text-sm">You&apos;re in. Welcome to INTERTEXE.</span>
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 md:gap-4">
            <p className="flex-1 min-w-0 text-[12px] md:text-[13px] font-light leading-snug">
              <span className="font-medium">Get our weekly edit</span> of the best natural fiber pieces — join free
            </p>
            <form
              onSubmit={handleSubmit}
              className="w-full sm:w-auto flex flex-col xs:flex-row flex-wrap items-stretch sm:items-center gap-2 min-w-0"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 min-w-0 w-full sm:min-w-[180px] sm:max-w-[280px] px-3 py-2.5 bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors"
                data-testid="input-banner-email"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="shrink-0 px-5 py-2.5 bg-white text-[#111] text-[10px] uppercase tracking-[0.15em] font-medium hover:bg-white/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
                data-testid="button-banner-submit"
              >
                {status === "loading" ? "..." : "Join"}
              </button>
            </form>
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 md:static w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0"
              aria-label="Dismiss"
              data-testid="button-banner-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {status === "error" && (
          <p className="text-xs text-red-400 mt-2">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}

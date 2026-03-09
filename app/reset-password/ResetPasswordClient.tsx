'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      if (data.token) {
        localStorage.setItem("intertexe_auth_token", data.token);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8 md:py-16 px-4">
        <div className="flex flex-col items-center w-full max-w-md gap-6 text-center">
          <h1 className="text-2xl md:text-3xl font-serif">Invalid Link</h1>
          <p className="text-muted-foreground text-sm">This password reset link is invalid or has expired.</p>
          <Link href="/account" className="text-xs uppercase tracking-[0.2em] border-b border-foreground pb-1">
            Back to Account
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8 md:py-16 px-4">
        <div className="flex flex-col items-center w-full max-w-md gap-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-foreground" />
          <h1 className="text-2xl md:text-3xl font-serif">Password Updated</h1>
          <p className="text-muted-foreground text-sm">Your password has been reset successfully. You are now logged in.</p>
          <Link href="/account"
            className="bg-foreground text-background py-4 px-8 uppercase tracking-[0.2em] text-xs font-medium hover:bg-foreground/90 transition-all active:scale-[0.98]">
            Go to Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8 md:py-16 px-4">
      <div className="flex flex-col items-center w-full max-w-md gap-8 md:gap-10">
        <div className="text-center flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Reset</span>
          <h1 className="text-3xl md:text-4xl font-serif">New Password</h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xs mx-auto">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-border/60 px-4 py-4 text-sm bg-background focus:outline-none focus:border-foreground transition-colors pr-14 placeholder:text-muted-foreground/40"
                placeholder="At least 6 characters"
                required
                data-testid="input-new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground p-1.5 active:scale-90 transition-transform">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-border/60 px-4 py-4 text-sm bg-background focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
              placeholder="Re-enter your password"
              required
              data-testid="input-confirm-password"
            />
          </div>

          {error && <p className="text-sm text-red-600" data-testid="text-reset-error">{error}</p>}

          <button type="submit" disabled={submitting}
            className="mt-2 bg-foreground text-background py-4 uppercase tracking-[0.2em] text-xs font-medium hover:bg-foreground/90 transition-all disabled:opacity-50 active:scale-[0.98]"
            data-testid="button-reset-password">
            {submitting ? "Please wait..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { X, Heart } from "lucide-react";

export function AuthLoginPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-background border border-border/60 shadow-xl p-8 md:p-10 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-3 pr-6">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 id="auth-prompt-title" className="text-lg md:text-xl font-serif tracking-tight">
            Sign in to save favorites
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create a free account or sign in to save products to your wishlist and sync across devices.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/account"
            onClick={onClose}
            className="w-full text-center border border-foreground px-6 py-3.5 uppercase tracking-[0.15em] text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/account"
            onClick={onClose}
            className="w-full text-center border border-border/60 px-6 py-3.5 uppercase tracking-[0.15em] text-[10px] md:text-xs hover:border-foreground transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

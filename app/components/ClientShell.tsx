"use client";

import { useState, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("./Navbar").then(m => ({ default: m.Navbar })), { ssr: false });
const ScrollToTop = dynamic(() => import("./ScrollToTop").then(m => ({ default: m.ScrollToTop })), { ssr: false });
const Analytics = dynamic(() => import("./Analytics").then(m => ({ default: m.Analytics })), { ssr: false });

export function ClientShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Analytics />
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-20 md:pb-0">
          {children}
        </main>
        {footer}
        <ScrollToTop />
      </div>
    </>
  );
}

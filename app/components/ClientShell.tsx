"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("./Navbar").then(m => ({ default: m.Navbar })), { ssr: false });
const ScrollToTop = dynamic(() => import("./ScrollToTop").then(m => ({ default: m.ScrollToTop })), { ssr: false });
const Analytics = dynamic(() => import("./Analytics").then(m => ({ default: m.Analytics })), { ssr: false });

const NAV_LINKS = [
  { name: "Fabrics", href: "/materials" },
  { name: "Shop", href: "/shop" },
  { name: "Directory", href: "/designers" },
  { name: "Scanner", href: "/scanner" },
  { name: "Quiz", href: "/quiz" },
  { name: "Chat", href: "/chat" },
];

export function ClientShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <Analytics />
      <div className="min-h-screen flex flex-col bg-background text-foreground" suppressHydrationWarning>
        {mounted ? <Navbar /> : (
          <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
            <div className="container mx-auto px-4 md:px-8 h-16 flex items-center">
              <Link href="/" className="flex items-center leading-none flex-shrink-0 z-10">
                <span className="font-serif text-xl md:text-2xl tracking-[0.25em] uppercase text-foreground">
                  <span className="font-light">INTER</span><span className="font-bold">TEXE</span>
                </span>
              </Link>
              <nav className="hidden md:flex items-center justify-center gap-8 flex-1 mx-8">
                {NAV_LINKS.map((link) => (
                  <Link key={link.name} href={link.href} className="text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground/70 whitespace-nowrap">
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
        )}
        <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-20 md:pb-0">
          {children}
        </main>
        {footer}
        {mounted && <ScrollToTop />}
      </div>
    </>
  );
}

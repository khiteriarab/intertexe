"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Menu } from "lucide-react";
import { MERCH_NAV } from "../../lib/merch-nav";
import { WearToWhereRail } from "./WearToWhereRail";
import { CountrySelector } from "./CountrySelector";

/** Mobile hamburger menu — nav links + NAP-style “Wear to where?” image carousel. */
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -ml-2 text-foreground"
        aria-label="Open menu"
        data-testid="button-mobile-menu"
      >
        <Menu className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {open &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[200] flex flex-col bg-background">
            <div className="flex items-center justify-between h-16 px-4 border-b border-border/40 shrink-0">
              <span className="text-[11px] uppercase tracking-[0.28em] font-medium">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2"
                aria-label="Close menu"
                data-testid="button-close-mobile-menu"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <nav className="px-4 py-6 flex flex-col">
                {MERCH_NAV.map((item) => (
                  <div key={item.name} className="border-b border-border/20 last:border-0">
                    <Link
                      href={item.href}
                      className="flex items-center justify-between py-4 text-sm uppercase tracking-[0.12em] text-foreground"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                      <span className="text-muted-foreground text-lg leading-none">›</span>
                    </Link>
                    {"children" in item && item.children && (
                      <ul className="pb-3 pl-1 flex flex-col gap-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block py-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
                              onClick={() => setOpen(false)}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                <Link
                  href="/scanner"
                  className="flex items-center justify-between py-4 text-sm uppercase tracking-[0.12em] border-b border-border/20"
                  onClick={() => setOpen(false)}
                >
                  Scanner
                  <span className="text-muted-foreground text-lg leading-none">›</span>
                </Link>

                <CountrySelector menuFooter className="px-0" />
              </nav>

              <WearToWhereRail title="Wear to where?" className="border-t border-border/30 bg-[#FAFAF8] pb-8" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

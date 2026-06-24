"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Menu } from "lucide-react";
import { MERCH_NAV } from "../../lib/merch-nav";
import { WearToWhereRail } from "./WearToWhereRail";
import { CountrySelector } from "./CountrySelector";
import { DesignersMenuPanel } from "./DesignersMenuPanel";

/** Mobile hamburger menu — nav links + NAP-style “Wear to where?” image carousel. */
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const [designersOpen, setDesignersOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setOpen(false);
    setDesignersOpen(false);
    setExpanded({});
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

  const toggleSection = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -ml-2 text-foreground touch-manipulation"
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
                className="p-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
                data-testid="button-close-mobile-menu"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {designersOpen ? (
                <div className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setDesignersOpen(false)}
                    className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6 touch-manipulation min-h-[44px]"
                  >
                    ← Menu
                  </button>
                  <DesignersMenuPanel onNavigate={() => setOpen(false)} compact />
                </div>
              ) : (
              <nav className="px-4 py-6 flex flex-col">
                {MERCH_NAV.map((item) => {
                  const hasChildren = "children" in item && item.children && item.children.length > 0;
                  const isExpanded = Boolean(expanded[item.name]);

                  return (
                  <div key={item.name} className="border-b border-border/20 last:border-0 relative isolate">
                    {item.name === "Designers" ? (
                      <button
                        type="button"
                        onClick={() => setDesignersOpen(true)}
                        className="flex w-full items-center justify-between py-4 min-h-[48px] text-sm uppercase tracking-[0.12em] text-foreground touch-manipulation"
                        data-testid="button-mobile-designers-menu"
                      >
                        <span>{item.name}</span>
                        <span className="text-muted-foreground text-lg leading-none pointer-events-none" aria-hidden>›</span>
                      </button>
                    ) : hasChildren ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleSection(item.name)}
                          className="flex w-full items-center justify-between py-4 min-h-[48px] text-sm uppercase tracking-[0.12em] text-foreground touch-manipulation"
                          aria-expanded={isExpanded}
                        >
                          <span>{item.name}</span>
                          <span
                            className={`text-muted-foreground text-lg leading-none pointer-events-none transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            aria-hidden
                          >
                            ›
                          </span>
                        </button>
                        {isExpanded && (
                          <ul className="pb-3 pl-1 flex flex-col gap-0">
                            <li>
                              <Link
                                href={item.href}
                                className="block py-3 min-h-[44px] text-[11px] uppercase tracking-[0.1em] text-foreground hover:text-foreground touch-manipulation"
                                onClick={() => setOpen(false)}
                              >
                                Shop all {item.name.toLowerCase()}
                              </Link>
                            </li>
                            {item.children!.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className="block py-3 min-h-[44px] text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground touch-manipulation"
                                  onClick={() => setOpen(false)}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                    <Link
                      href={item.href}
                      className="flex items-center justify-between py-4 min-h-[48px] text-sm uppercase tracking-[0.12em] text-foreground touch-manipulation"
                      onClick={() => setOpen(false)}
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground text-lg leading-none pointer-events-none" aria-hidden>›</span>
                    </Link>
                    )}
                  </div>
                  );
                })}
                <Link
                  href="/rewards"
                  className="flex items-center justify-between py-4 min-h-[48px] text-sm uppercase tracking-[0.12em] border-b border-border/20 touch-manipulation"
                  onClick={() => setOpen(false)}
                >
                  <span>Rewards</span>
                  <span className="text-muted-foreground text-lg leading-none pointer-events-none" aria-hidden>›</span>
                </Link>
                <Link
                  href="/scanner"
                  className="flex items-center justify-between py-4 min-h-[48px] text-sm uppercase tracking-[0.12em] border-b border-border/20 touch-manipulation"
                  onClick={() => setOpen(false)}
                >
                  <span>Scanner</span>
                  <span className="text-muted-foreground text-lg leading-none pointer-events-none" aria-hidden>›</span>
                </Link>

                <CountrySelector menuFooter className="px-0" />
              </nav>
              )}

              {!designersOpen && (
              <WearToWhereRail title="Wear to where?" className="border-t border-border/30 bg-[#FAFAF8] pb-8" />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

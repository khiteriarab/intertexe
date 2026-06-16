"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Home, Layers, Scan, ShoppingBag, User } from "lucide-react";

const mobileNavLinks = [
  { name: "Home", href: "/", icon: Home },
  { name: "New In", href: "/shop?sort=new", icon: ShoppingBag },
  { name: "Scanner", href: "/scanner", icon: Scan },
  { name: "Fabrics", href: "/materials", icon: Layers },
  { name: "Designers", href: "/designers", icon: User },
  { name: "Sale", href: "/sale", icon: ShoppingBag },
];

/** Fixed mobile chrome portaled to body so it never scrolls with page content (iOS-safe). */
export function MobileBottomDock() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-[100] bg-background border-t border-border/30"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="mobile-bottom-dock"
    >
      <nav className="flex justify-around items-center h-[56px] px-1 bg-background/95 backdrop-blur-md">
        {mobileNavLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href.split("?")[0]));
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors active:scale-95 min-w-[48px] min-h-[48px] ${
                isActive ? "text-foreground" : "text-muted-foreground/70"
              }`}
              data-testid={`link-mobile-nav-${link.name.toLowerCase()}`}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[9px] tracking-wider uppercase font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>,
    document.body
  );
}

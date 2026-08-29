import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { getShopHubMenu } from "../../../lib/shop-hub-menu";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse clothing, shoes, collections, designers, and fabrics — verified natural fibers.",
  robots: { index: false, follow: true },
};

/** Lightweight Shop hub — mirrors iOS Shop tab menu (not the full PLP). */
export default function ShopHubPage() {
  const menu = getShopHubMenu();
  return (
    <div className="min-h-[70vh] bg-background pb-28 md:pb-16" data-testid="shop-hub-page">
      <div className="max-w-lg mx-auto px-4 md:px-6 pt-4 md:pt-10">
        <Link
          href="/search"
          className="flex items-center gap-3 px-4 py-3.5 mb-3 border border-border/60 bg-[#f8f7f5] text-muted-foreground touch-manipulation"
          data-testid="shop-hub-search"
        >
          <Search className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span className="text-[13px] tracking-wide">
            Search <span className="font-serif italic text-foreground/80">Intertexe</span>
          </span>
        </Link>

        <nav className="flex flex-col" aria-label="Shop menu">
          {menu.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center justify-between py-5 border-b border-border/50 text-[17px] font-light text-foreground touch-manipulation active:opacity-70"
              data-testid={`shop-hub-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span>{item.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70" strokeWidth={1.25} />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

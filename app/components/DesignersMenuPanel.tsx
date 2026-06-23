"use client";

import Link from "next/link";
import { DESIGNERS_MENU_FEATURED, DESIGNERS_MENU_OUR_PICKS, DESIGNERS_SPOTLIGHT } from "../../lib/designers-directory-nav";

function MenuRow({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between py-3.5 border-b border-border/15 last:border-0 group"
    >
      <span className="text-[15px] text-foreground group-hover:text-foreground/70 transition-colors">{label}</span>
      <span className="text-muted-foreground/60 text-lg leading-none" aria-hidden>
        ›
      </span>
    </Link>
  );
}

/** NAP-style Designers flyout — featured list, our picks, RE/DONE spotlight. */
export function DesignersMenuPanel({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-col" : "flex flex-col min-w-[280px] max-w-[360px]"}>
      <div className="px-1 pb-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Featured Designers</p>
        {DESIGNERS_MENU_FEATURED.map((item) => (
          <MenuRow key={item.href} href={item.href} label={item.name} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="px-1 pt-4 pb-2 border-t border-border/20">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Our Picks</p>
        {DESIGNERS_MENU_OUR_PICKS.map((item) => (
          <MenuRow key={item.href} href={item.href} label={item.name} onNavigate={onNavigate} />
        ))}
      </div>

      <Link
        href={DESIGNERS_SPOTLIGHT.href}
        onClick={onNavigate}
        className="mt-4 block group"
        data-testid="designers-spotlight-redone"
      >
        <div className="aspect-[4/5] relative overflow-hidden bg-[#f0ece6]">
          <img
            src={DESIGNERS_SPOTLIGHT.imageUrl}
            alt={DESIGNERS_SPOTLIGHT.name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>
        <p className="font-serif text-[17px] text-foreground mt-4 leading-snug">{DESIGNERS_SPOTLIGHT.headline}</p>
        <span className="text-[11px] uppercase tracking-[0.14em] text-foreground underline underline-offset-4 mt-2 inline-block group-hover:opacity-70 transition-opacity">
          {DESIGNERS_SPOTLIGHT.cta}
        </span>
      </Link>
    </div>
  );
}

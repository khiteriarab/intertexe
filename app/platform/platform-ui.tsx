import Link from "next/link";
import type { ReactNode } from "react";

export const SERIF = { fontFamily: "var(--itx-serif, Georgia, 'Iowan Old Style', Palatino, serif)" } as const;

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`platform-kicker mb-5 text-[var(--platform-quiet,#5c5852)] ${className}`}>{children}</p>;
}

export function Heading({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <h2 id={id} className={`platform-display text-[var(--platform-ink,#111111)] ${className}`} style={SERIF}>
      {children}
    </h2>
  );
}

export function Body({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`platform-copy ${className}`}>{children}</p>;
}

export function PrimaryLink({
  href,
  children,
  tone = "light",
}: {
  href: string;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  const onDark = tone === "dark";
  return (
    <Link
      href={href}
      className={
        onDark
          ? "inline-flex w-full sm:w-auto items-center justify-center rounded-full text-[11px] tracking-[0.14em] uppercase bg-[var(--platform-surface)] text-[var(--platform-primary)] px-7 py-3.5 hover:bg-[var(--platform-highlight)] min-h-[44px] transition-colors"
          : "inline-flex w-full sm:w-auto items-center justify-center rounded-sm text-[11px] tracking-[0.14em] uppercase bg-[var(--platform-ink)] text-white px-7 py-3.5 hover:bg-black min-h-[44px] transition-colors"
      }
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  href,
  children,
  tone = "light",
}: {
  href: string;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  const onDark = tone === "dark";
  return (
    <Link
      href={href}
      className={
        onDark
          ? "inline-flex w-full sm:w-auto items-center justify-center rounded-full text-[11px] tracking-[0.14em] uppercase border border-white/70 text-white px-7 py-3.5 hover:bg-white/10 min-h-[44px] transition-colors"
          : "inline-flex w-full sm:w-auto items-center justify-center rounded-sm text-[11px] tracking-[0.14em] uppercase border border-[var(--platform-ink,#111111)]/25 text-[var(--platform-ink,#111111)] px-7 py-3.5 hover:bg-[var(--platform-highlight)] min-h-[44px] transition-colors"
      }
    >
      {children}
    </Link>
  );
}

export function SoftwareStage({
  children,
  title,
  copy,
}: {
  children: ReactNode;
  title?: string;
  copy?: string;
}) {
  return (
    <div className="bg-[var(--platform-surface)] p-0">
      {title ? (
        <p className="text-[15px] sm:text-[17px] font-medium text-[var(--platform-primary)] mb-1">{title}</p>
      ) : null}
      {copy ? <p className="text-sm text-[var(--platform-muted)] font-light mb-5">{copy}</p> : null}
      <div className="p-0">{children}</div>
    </div>
  );
}

export function DiscoverLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={
        className ??
        "inline-flex items-center gap-2 px-0 py-2.5 text-[13px] font-medium text-[var(--platform-ink)] min-h-[44px] hover:text-[var(--platform-gold)] transition-colors underline underline-offset-4"
      }
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function Frame({
  label,
  children,
  caption,
}: {
  label: string;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure className="m-0">
      <div className="bg-white overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--platform-border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="ml-2 text-[10px] tracking-[0.14em] uppercase text-[#8a847c]">{label}</span>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
      {caption ? <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">{caption}</figcaption> : null}
    </figure>
  );
}

export function QrMark() {
  const cells = [
    1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1,
    0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0,
    1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1,
  ];
  return (
    <div
      className="grid w-[108px] h-[108px] md:w-[108px] md:h-[108px] gap-[2px] bg-white p-1.5 border border-[#e8e3da]"
      style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
      aria-hidden="true"
    >
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-[#161513]" : "bg-transparent"} />
      ))}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export const SERIF = { fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif" } as const;

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-5">
      {children}
    </p>
  );
}

export function Heading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] text-[#161513] ${className}`}
      style={SERIF}
    >
      {children}
    </h2>
  );
}

export function Body({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] sm:text-base text-[#5c5854] font-light leading-relaxed ${className}`}>{children}</p>;
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
          ? "inline-flex w-full sm:w-auto items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-white text-[#152238] px-7 py-3.5 hover:bg-[#f7f5f1] min-h-[44px]"
          : "inline-flex w-full sm:w-auto items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-[#152238] text-white px-7 py-3.5 hover:bg-[#0f1a2c] min-h-[44px]"
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
          ? "inline-flex w-full sm:w-auto items-center justify-center text-[11px] tracking-[0.14em] uppercase border border-white/70 text-white px-7 py-3.5 hover:bg-white/10 min-h-[44px]"
          : "inline-flex w-full sm:w-auto items-center justify-center text-[11px] tracking-[0.14em] uppercase border border-[#161513] px-7 py-3.5 hover:bg-white min-h-[44px]"
      }
    >
      {children}
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
      <div className="rounded-xl border border-[#e8e3da] bg-white overflow-hidden shadow-[0_20px_50px_rgba(22,21,19,0.04)]">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#eeeae4] bg-[#faf8f5]">
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

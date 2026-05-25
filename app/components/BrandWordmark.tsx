import Link from "next/link";

const SIZE_CLASS = {
  sm: "text-base tracking-[0.22em]",
  md: "text-xl md:text-2xl tracking-[0.25em]",
  lg: "text-2xl md:text-3xl tracking-[0.28em]",
} as const;

/** INTER regular + TEXE bold — canonical brand lockup. */
export function BrandWordmark({
  className = "",
  size = "md",
  asLink = false,
  testId,
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASS;
  asLink?: boolean;
  testId?: string;
}) {
  const inner = (
    <span className={`font-serif uppercase inline-flex leading-none ${SIZE_CLASS[size]} ${className}`}>
      <span className="font-light">INTER</span>
      <span className="font-bold">TEXE</span>
    </span>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        className="inline-flex leading-none flex-shrink-0"
        data-testid={testId || "link-home-logo"}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

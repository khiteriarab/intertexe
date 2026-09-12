import type { ReactNode } from "react";
import { Eyebrow, PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";

export function PlatformPageHeader({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  align = "left",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  align?: "left" | "center";
  children?: ReactNode;
}) {
  const centered = align === "center";

  return (
    <section className="platform-abstract-band itx-abstract-motif border-b border-[var(--platform-border)]">
      <div
        className={`relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-14 sm:pt-16 md:pt-20 pb-12 sm:pb-16 ${
          centered ? "text-center" : ""
        }`}
      >
        <Eyebrow className={centered ? "mb-5" : ""}>{eyebrow}</Eyebrow>
        <h1
          className={`text-[2.15rem] sm:text-[3rem] md:text-[3.35rem] font-light leading-[1.08] tracking-[-0.02em] text-[var(--platform-ink)] max-w-4xl mb-5 ${
            centered ? "mx-auto" : ""
          }`}
          style={SERIF}
        >
          {title}
        </h1>
        <p
          className={`text-[15px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] max-w-2xl mb-8 ${
            centered ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
        {primaryHref && primaryLabel ? (
          <div className={`flex flex-col sm:flex-row gap-3 mb-2 ${centered ? "justify-center" : ""}`}>
            <PrimaryLink href={primaryHref}>{primaryLabel}</PrimaryLink>
            {secondaryHref && secondaryLabel ? (
              <SecondaryLink href={secondaryHref}>{secondaryLabel}</SecondaryLink>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

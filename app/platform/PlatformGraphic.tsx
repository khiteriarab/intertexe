import type { ReactNode } from "react";
import { PLATFORM_GRAPHICS, type PlatformGraphicId } from "../../lib/platform-graphics";

const IMAGE_CLASS =
  "w-full h-auto rounded-xl border border-[#e8e3da] bg-[#161513] shadow-[0_24px_60px_rgba(22,21,19,0.12)]";

export function PlatformGraphic({
  slot,
  className = "",
  caption,
}: {
  slot: PlatformGraphicId;
  className?: string;
  caption?: string;
}) {
  const spec = PLATFORM_GRAPHICS[slot];
  if (!spec.ready) return null;
  return (
    <figure className={`m-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spec.src} alt={spec.alt} width={spec.width} height={spec.height} className={IMAGE_CLASS} loading="lazy" />
      {caption ? <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">{caption}</figcaption> : null}
    </figure>
  );
}

/** Render designed screenshot when ready, otherwise fall back to legacy CSS preview. */
export function PlatformGraphicOrFallback({
  slot,
  fallback,
  className = "",
  caption,
}: {
  slot: PlatformGraphicId;
  fallback: ReactNode;
  className?: string;
  caption?: string;
}) {
  const spec = PLATFORM_GRAPHICS[slot];
  if (spec.ready) {
    return <PlatformGraphic slot={slot} className={className} caption={caption} />;
  }
  return <>{fallback}</>;
}

import { PLATFORM_GRAPHICS, type PlatformGraphicId } from "../../lib/platform-graphics";

export function PlatformGraphic({
  slot,
  className = "",
}: {
  slot: PlatformGraphicId;
  className?: string;
}) {
  const spec = PLATFORM_GRAPHICS[slot];
  if (!spec.ready) return null;
  return (
    <figure className={`m-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spec.src}
        alt={spec.alt}
        width={spec.width}
        height={spec.height}
        className="w-full h-auto border border-[#e8e3da] bg-white"
      />
    </figure>
  );
}

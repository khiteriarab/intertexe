/**
 * Editorial campaign imagery — show full composition on mobile AND desktop (no wide-crop cutoffs).
 */

export type EditorialHeroVariant = "panel" | "collection" | "banner";

const FRAME_CLASS: Record<EditorialHeroVariant, string> = {
  /** Homepage collection edits (Vacation, Evening, …) */
  panel: "aspect-[3/4] w-full max-h-[min(92vh,900px)] md:max-h-[min(85vh,820px)]",
  /** /collections/[slug] hero */
  collection: "aspect-[3/4] w-full max-h-[min(80vh,760px)] md:max-h-[min(75vh,720px)]",
  /** Homepage top hero — same portrait frame as collection edits */
  banner: "aspect-[3/4] w-full max-h-[min(92vh,900px)] md:max-h-[min(88vh,860px)] min-h-[520px]",
};

type Props = {
  src: string;
  alt: string;
  variant?: EditorialHeroVariant;
  className?: string;
  /** Subtle zoom on hover for linked panels */
  hoverZoom?: boolean;
};

export function EditorialHeroImage({
  src,
  alt,
  variant = "panel",
  className = "",
  hoverZoom = false,
}: Props) {
  const frame = FRAME_CLASS[variant];
  const imgClass = [
    "w-full h-full object-contain object-center",
    hoverZoom ? "group-hover:scale-[1.02] transition-transform duration-[1200ms] ease-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`relative overflow-hidden bg-[#f2f1ef] flex items-center justify-center ${frame} ${className}`}
      data-editorial-hero={variant}
    >
      {src ? (
        <img src={src} alt={alt} className={imgClass} loading={variant === "banner" ? "eager" : "lazy"} />
      ) : null}
    </div>
  );
}

import { useState } from "react";
import { getBrandScreenshotUrl, getBrandLogoUrl } from "@/lib/brand-images";

export function BrandImage({ name, className, size = "screenshot" }: { name: string; className?: string; size?: "screenshot" | "logo" }) {
  const [failed, setFailed] = useState(false);
  const url = size === "logo" ? getBrandLogoUrl(name) : getBrandScreenshotUrl(name);

  if (!url || failed) {
    return (
      <div className={`flex items-center justify-center bg-secondary ${className}`}>
        <span className="font-serif text-4xl md:text-6xl text-muted-foreground/15">{name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div className={`relative bg-secondary overflow-hidden ${className}`}>
      <img
        src={url}
        alt={`${name} website`}
        className="absolute inset-0 w-full h-full object-cover object-top"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

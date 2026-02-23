import { useState } from "react";
import { getBrandHeroImage } from "@/lib/brand-hero-images";

export function BrandImage({ name, className }: { name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const heroUrl = getBrandHeroImage(name);

  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {!failed ? (
        <img
          src={heroUrl}
          alt={`${name} editorial`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f5f0eb]">
          <span className="font-serif text-2xl md:text-3xl text-foreground/15 tracking-widest uppercase">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { getBrandHeroImage } from "@/lib/brand-hero-images";

export function BrandImage({ name, className }: { name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const heroUrl = getBrandHeroImage(name);

  const hasImage = heroUrl && !failed;

  return (
    <div className={`relative overflow-hidden ${hasImage ? 'bg-secondary' : 'bg-[#f0ece6]'} ${className}`}>
      {hasImage ? (
        <img
          src={heroUrl}
          alt={`${name} editorial`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <span className="font-serif text-lg md:text-xl text-foreground/30 tracking-[0.15em] uppercase text-center leading-relaxed">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { getBrandLogoUrl } from "@/lib/brand-images";
import { getBrandHeroImage } from "@/lib/brand-hero-images";

export function BrandImage({ name, className, showLogo = false }: { name: string; className?: string; showLogo?: boolean }) {
  const [heroFailed, setHeroFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const heroUrl = getBrandHeroImage(name);
  const logoUrl = getBrandLogoUrl(name);

  const useHero = heroUrl && !heroFailed && !showLogo;

  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {useHero ? (
        <img
          src={heroUrl}
          alt={`${name} campaign`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setHeroFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="absolute font-serif text-[120px] md:text-[160px] text-foreground/[0.03] select-none leading-none">
            {name.charAt(0)}
          </span>
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-12 h-12 md:w-16 md:h-16 object-contain relative z-10"
              loading="lazy"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="font-serif text-3xl md:text-4xl text-foreground/20 relative z-10">
              {name.charAt(0)}
            </span>
          )}
          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-foreground/50 mt-3 md:mt-4 relative z-10 text-center px-3 leading-relaxed">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}

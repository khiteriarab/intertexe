import { useState } from "react";
import { getBrandLogoUrl } from "@/lib/brand-images";

export function BrandImage({ name, className }: { name: string; className?: string }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getBrandLogoUrl(name);

  return (
    <div className={`flex flex-col items-center justify-center bg-secondary relative overflow-hidden ${className}`}>
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
  );
}

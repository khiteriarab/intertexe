import Link from "next/link";

const PILLARS = [
  {
    tag: "Product intelligence",
    title: "Turn fragmented product data into one trusted record.",
    copy: "Bring together materials, suppliers, manufacturing, certifications, and source files. INTERTEXE structures the data, resolves gaps, and creates one governed product record.",
    cta: "Explore product intelligence",
    href: "/platform/demo",
    featured: false,
    icon: "layers" as const,
  },
  {
    tag: "Traceability + compliance",
    title: "Prove what your product is, where it came from, and whether it's ready.",
    copy: "Trace materials and manufacturing, identify missing evidence, substantiate claims, and prepare product data for Digital Product Passports and evolving regulation.",
    cta: "Explore traceability",
    href: "/platform/demo",
    featured: false,
    icon: "shield" as const,
  },
  {
    tag: "Connected product lifecycle",
    title: "Keep the product record working after the first sale.",
    copy: "Publish through QR, NFC, RFID, branded passports, or API. Give consumers care guidance, repair options, resale value, ownership transfer, and next-life pathways from the same record.",
    cta: "Explore the lifecycle",
    href: "/platform/demo",
    featured: true,
    icon: "lifecycle" as const,
  },
] as const;

function PillarIcon({ kind }: { kind: (typeof PILLARS)[number]["icon"] }) {
  const cls = "h-5 w-5";
  if (kind === "layers") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
      </svg>
    );
  }
  if (kind === "shield") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 12a8 8 0 0 1 13.5-5.7M20 12a8 8 0 0 1-13.5 5.7" />
      <path d="M17 3h3v3M7 21H4v-3" />
    </svg>
  );
}

function PillarCta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="platform-product-pillar-cta group">
      <span>{label}</span>
      <span className="platform-product-pillar-cta-icon" aria-hidden>
        →
      </span>
    </Link>
  );
}

export function PlatformProductPillarsVisual({ variant = "dark" }: { variant?: "dark" | "light" }) {
  return (
    <div className={`platform-product-pillars-grid ${variant === "light" ? "platform-product-pillars-grid--light" : ""}`}>
      {PILLARS.map((pillar) => (
        <article
          key={pillar.tag}
          className={`platform-product-pillar ${pillar.featured ? "platform-product-pillar--featured" : ""}`}
        >
          <div className="platform-product-pillar-top">
            <span className="platform-product-pillar-icon" aria-hidden>
              <PillarIcon kind={pillar.icon} />
            </span>
            <p className="platform-product-pillar-tag">{pillar.tag}</p>
          </div>
          <h3 className="platform-product-pillar-title">{pillar.title}</h3>
          <p className="platform-product-pillar-copy">{pillar.copy}</p>
          <PillarCta href={pillar.href} label={pillar.cta} />
        </article>
      ))}
    </div>
  );
}

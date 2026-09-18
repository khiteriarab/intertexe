import Image from "next/image";
import Link from "next/link";

const PILLARS = [
  {
    tag: "Product intelligence",
    index: "01",
    title: "Turn fragmented product data into one trusted record.",
    copy: "Bring together materials, suppliers, manufacturing, certifications, and source files. INTERTEXE structures the data, resolves gaps, and creates one governed product record.",
    chips: ["Materials", "Composition", "Supplier", "Factory", "Origin"],
    cta: "Explore product intelligence",
    href: "/platform/demo",
    image: "/platform/workspace-overview.png",
    imageAlt: "INTERTEXE workspace overview — catalog readiness, products, and next actions.",
    featured: false,
  },
  {
    tag: "Traceability + compliance",
    index: "02",
    title: "Prove what your product is, where it came from, and whether it's ready.",
    copy: "Trace materials and manufacturing, identify missing evidence, substantiate claims, and prepare product data for Digital Product Passports and evolving regulation.",
    chips: ["Verification", "Evidence", "Certifications", "DPP readiness"],
    cta: "Explore traceability",
    href: "/platform/demo",
    image: "/platform/workspace-issues-inbox.png",
    imageAlt: "INTERTEXE issues inbox — missing fields, conflicts, and blocking publish findings.",
    featured: false,
  },
  {
    tag: "Connected product lifecycle",
    index: "03",
    title: "Keep the product record working after the first sale.",
    copy: "Publish through QR, NFC, RFID, branded passports, or API. Give consumers care guidance, repair options, resale value, ownership transfer, and next-life pathways from the same record.",
    chips: ["Passport", "Care", "Repair", "Resale"],
    cta: "Explore the lifecycle",
    href: "/platform/demo",
    image: "/platform/act-passport.png",
    imageAlt: "INTERTEXE passport studio with consumer-facing product experience.",
    featured: true,
  },
] as const;

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
          <div>
            <p className="platform-product-pillar-index">{pillar.index}</p>
            <p className="platform-product-pillar-tag">{pillar.tag}</p>
            <h3 className="platform-product-pillar-title">{pillar.title}</h3>
            <p className="platform-product-pillar-copy">{pillar.copy}</p>
            <ul className="platform-product-pillar-chips">
              {pillar.chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
            <PillarCta href={pillar.href} label={pillar.cta} />
          </div>
          <div className="platform-product-pillar-visual">
            <Image src={pillar.image} alt={pillar.imageAlt} fill className="object-cover object-top" sizes="(max-width: 899px) 92vw, 720px" />
          </div>
        </article>
      ))}
      <p className="platform-product-flow">
        <span>Product data</span>
        <span aria-hidden>→</span>
        <span>Verify + govern</span>
        <span aria-hidden>→</span>
        <span>Publish</span>
        <span aria-hidden>→</span>
        <span>Consumer</span>
      </p>
    </div>
  );
}

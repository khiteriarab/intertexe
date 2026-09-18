import Image from "next/image";
import Link from "next/link";

const PILLARS = [
  {
    tag: "Product intelligence",
    title: "Turn fragmented product data into one trusted record.",
    copy: "Bring together materials, suppliers, manufacturing, certifications, and source files. INTERTEXE structures the data, resolves gaps, and creates one governed product record.",
    href: "/platform/demo#journey",
  },
  {
    tag: "Traceability + compliance",
    title: "Prove what your product is, where it came from, and whether it's ready.",
    copy: "Trace materials and manufacturing, identify missing evidence, substantiate claims, and prepare product data for Digital Product Passports and evolving regulation.",
    href: "/platform/demo#passport",
  },
  {
    tag: "Connected product lifecycle",
    title: "Keep the product record working after the first sale.",
    copy: "Publish through QR, NFC, RFID, branded passports, or API. Give consumers care guidance, repair options, resale value, ownership transfer, and next-life pathways from the same record.",
    href: "/platform#delivery",
  },
] as const;

export function PlatformProductPillarsVisual({ variant = "dark" }: { variant?: "dark" | "light" }) {
  return (
    <div className={`platform-product-pillars-grid ${variant === "light" ? "platform-product-pillars-grid--light" : ""}`}>
      {PILLARS.map((pillar) => (
        <article key={pillar.tag} className="platform-product-pillar">
          <Image
            src="/app-icon.png"
            alt=""
            width={44}
            height={44}
            className="platform-product-pillar-mark"
            unoptimized
          />
          <p className="platform-product-pillar-tag">{pillar.tag}</p>
          <h3 className="platform-product-pillar-title">{pillar.title}</h3>
          <p className="platform-product-pillar-copy">{pillar.copy}</p>
          <Link href={pillar.href} className="platform-product-pillar-cta">
            <span>Learn more</span>
            <span className="platform-product-pillar-cta-icon" aria-hidden>
              →
            </span>
          </Link>
        </article>
      ))}
    </div>
  );
}

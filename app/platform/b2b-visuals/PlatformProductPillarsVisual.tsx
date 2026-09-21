import Image from "next/image";
import Link from "next/link";

const PILLARS = [
  {
    tag: "Product intelligence",
    title: "Turn fragmented product data into one trusted record.",
    copy: "Bring together materials, suppliers, manufacturing, certifications, and source files. INTERTEXE structures the data, resolves gaps, and creates one governed product record.",
    href: "/brands/demo#journey",
    icon: "/platform/symbols/story-product-identity.png",
  },
  {
    tag: "Traceability + compliance",
    title: "Prove what your product is, where it came from, and whether it's ready.",
    copy: "Trace materials and manufacturing, identify missing evidence, substantiate claims, and prepare product data for Digital Product Passports and evolving regulation.",
    href: "/brands/demo#passport",
    icon: "/platform/symbols/story-carrier-qr-nfc.png",
  },
  {
    tag: "Connected product lifecycle",
    title: "Keep the product record working after the first sale.",
    copy: "Publish through QR, NFC, RFID, branded passports, or API. Give consumers care guidance, repair options, resale value, ownership transfer, and next-life pathways from the same record.",
    href: "/brands#delivery",
    icon: "/platform/symbols/story-delivery-channels.png",
  },
] as const;

export function PlatformProductPillarsVisual({ variant = "dark" }: { variant?: "dark" | "light" }) {
  return (
    <div className={`platform-product-pillars-grid ${variant === "light" ? "platform-product-pillars-grid--light" : ""}`}>
      {PILLARS.map((pillar) => (
        <article key={pillar.tag} className="platform-product-pillar">
          <span className="platform-product-pillar-mark" aria-hidden>
            <Image src={pillar.icon} alt="" width={56} height={56} unoptimized />
          </span>
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

import Link from "next/link";
import { SERIF } from "./platform-ui";
import "./solutions/solutions.css";

const PILLARS = [
  {
    title: "Know more",
    body: "Bring materials, suppliers, evidence, and product data into one trusted record.",
  },
  {
    title: "Prove more",
    body: "Turn traceability, compliance, and sustainability information into evidence-backed product intelligence.",
  },
  {
    title: "Do more",
    body: "Publish passports, connect consumer and retail experiences, measure performance, and extend the product into repair, resale, and next life.",
  },
] as const;

/** Dark closing synthesis + conversion — shared by Solutions and See it live. */
export function SolutionsClose({
  cta = "solutions_close",
  headingId = "solutions-close-heading",
}: {
  cta?: string;
  headingId?: string;
}) {
  return (
    <section className="solutions-close" aria-labelledby={headingId}>
      <div className="platform-lux-wrap">
        <header className="solutions-close-head">
          <h2 id={headingId} className="solutions-close-title" style={SERIF}>
            One product record. Every use case connected.
          </h2>
          <p className="solutions-close-lede">
            INTERTEXE brings product data, material intelligence, traceability, compliance, Digital Product
            Passports, connected experiences, and circularity into one governed system.
          </p>
        </header>

        <ul className="solutions-close-pillars">
          {PILLARS.map((pillar) => (
            <li key={pillar.title}>
              <h3 className="solutions-close-pillar-title" style={SERIF}>
                {pillar.title}
              </h3>
              <p>{pillar.body}</p>
            </li>
          ))}
        </ul>

        <div className="solutions-close-convert">
          <p className="solutions-close-convert-line" style={SERIF}>
            See what INTERTEXE could look like for your products.
          </p>
          <div className="solutions-close-actions">
            <Link
              href={`/brands/request?intent=saas&cta=${encodeURIComponent(cta)}`}
              className="solutions-close-cta-primary"
            >
              Book a demo
            </Link>
            <Link href="/brands/pricing" className="solutions-close-cta-secondary">
              Explore pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

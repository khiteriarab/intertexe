import Image from "next/image";
import Link from "next/link";
import { SERIF } from "./platform-ui";
import "./solutions/solutions.css";

const MICROCOPY = ["Product data", "Traceability", "Passport", "Intelligence", "Lifecycle"] as const;

/** See it live opener — left editorial copy + workspace graphic. */
export function GovernedRecordStageSection() {
  return (
    <section className="governed-opener" aria-labelledby="governed-record-heading">
      <div className="platform-lux-wrap governed-opener-wrap">
        <div className="governed-opener-copy">
          <p className="governed-opener-eyebrow">One record. Every stage connected.</p>
          <h1 id="governed-record-heading" className="governed-opener-title" style={SERIF}>
            From product data
            <br />
            to product intelligence.
          </h1>
          <p className="governed-opener-body">
            INTERTEXE connects fragmented product, material, supplier, and lifecycle data into one governed record your
            teams can use across compliance, Digital Product Passports, customer experiences, and next-life services.
          </p>
          <div className="governed-opener-actions">
            <Link href="#journey" className="governed-opener-cta-primary">
              See it live
              <span aria-hidden>→</span>
            </Link>
            <a href="#journey" className="governed-opener-cta-secondary">
              Explore the 6 stages
              <span aria-hidden>↓</span>
            </a>
          </div>
          <p className="governed-opener-micro" aria-label="Product journey themes">
            {MICROCOPY.map((item, index) => (
              <span key={item}>
                {index > 0 ? <span className="governed-opener-micro-sep" aria-hidden>
                  /
                </span> : null}
                {item}
              </span>
            ))}
          </p>
        </div>

        <div className="governed-opener-visual">
          <Image
            src="/platform/demo-governed-workspace.png"
            alt="INTERTEXE workspace with catalog readiness, material intelligence, traceability, and passport activity cards."
            width={1672}
            height={941}
            className="governed-opener-image"
            sizes="(max-width: 899px) 94vw, 68vw"
            priority
          />
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { SERIF } from "./platform-ui";
import "./solutions/solutions.css";

/** See it live hero — minimal top copy, dominant workspace graphic below. */
export function GovernedRecordStageSection() {
  return (
    <section className="governed-opener" aria-labelledby="governed-record-heading">
      <div className="governed-opener-head">
        <h1 id="governed-record-heading" className="governed-opener-title" style={SERIF}>
          From product data all the way to product intelligence.
        </h1>
        <p className="governed-opener-body">
          The platform empowering fashion brands on compliance and Digital Product Passports.
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
      </div>

      <div className="governed-opener-visual">
        <Image
          src="/platform/demo-governed-workspace.png"
          alt="INTERTEXE workspace with catalog readiness, material intelligence, traceability, and passport activity cards."
          width={1672}
          height={941}
          className="governed-opener-image"
          sizes="100vw"
          priority
        />
      </div>
    </section>
  );
}

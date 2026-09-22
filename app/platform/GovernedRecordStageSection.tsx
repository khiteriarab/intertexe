import Link from "next/link";
import { SERIF } from "./platform-ui";
import "./solutions/solutions.css";

/** See it live hero — minimal top copy, dominant floating workspace graphic. */
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
        {/* Native img keeps PNG alpha reliable for the floating composition. */}
        <img
          src="/platform/demo-governed-workspace.png?v=float3"
          alt="INTERTEXE workspace with catalog readiness, material intelligence, traceability, and passport activity cards."
          width={2552}
          height={1868}
          className="governed-opener-image"
          decoding="async"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}

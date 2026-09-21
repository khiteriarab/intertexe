import Image from "next/image";
import { SERIF } from "./platform-ui";
import { LIFECYCLE_STAGES } from "./solutions/solutions-data";
import "./solutions/solutions.css";

/** Dark “one governed record” stage strip + product shot — used atop See it live. */
export function GovernedRecordStageSection() {
  return (
    <section className="solutions-dark" aria-labelledby="governed-record-heading">
      <div className="platform-lux-wrap">
        <div className="solutions-dark-copy">
          <h2 id="governed-record-heading" className="solutions-dark-title" style={SERIF}>
            One governed record. Every stage connected.
          </h2>
          <p className="solutions-dark-body">
            The same product data powers traceability, compliance, environmental intelligence, consumer experiences,
            and next-life services without rebuilding the record for every use case.
          </p>
        </div>

        <ol className="solutions-lifecycle">
          {LIFECYCLE_STAGES.map((item, index) => (
            <li key={item.stage}>
              <span className="solutions-lifecycle-stage">{item.stage}</span>
              <span className="solutions-lifecycle-label">{item.label}</span>
              {index < LIFECYCLE_STAGES.length - 1 ? (
                <span className="solutions-lifecycle-arrow" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="solutions-shot">
          <Image
            src="/platform/solutions-governed-record.png"
            alt="INTERTEXE consumer passport on mobile beside the product Impact workspace on desktop."
            width={1672}
            height={941}
            className="solutions-shot-main"
            sizes="(max-width: 899px) 94vw, 1100px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
